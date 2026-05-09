import io
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import cv2
from PIL import Image
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from torchvision.models import efficientnet_b4, EfficientNet_B4_Weights
import base64
import os
import math

app = Flask(__name__)
CORS(app)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ===== MODEL ARCHITECTURE =====
class ConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )
    def forward(self, x):
        return self.block(x)

class UNetEfficientB4(nn.Module):
    def __init__(self):
        super().__init__()
        backbone = efficientnet_b4(weights=None)
        features = backbone.features
        self.enc0 = features[0]
        self.enc1 = features[1]
        self.enc2 = features[2]
        self.enc3 = features[3]
        self.enc4 = nn.Sequential(features[4], features[5])
        self.enc5 = nn.Sequential(features[6], features[7])
        self.up5  = nn.ConvTranspose2d(448, 160, kernel_size=2, stride=2)
        self.dec5 = ConvBlock(160 + 160, 160)
        self.up4  = nn.ConvTranspose2d(160, 56, kernel_size=2, stride=2)
        self.dec4 = ConvBlock(56 + 56, 56)
        self.up3  = nn.ConvTranspose2d(56, 32, kernel_size=2, stride=2)
        self.dec3 = ConvBlock(32 + 32, 32)
        self.up2  = nn.ConvTranspose2d(32, 24, kernel_size=2, stride=2)
        self.dec2 = ConvBlock(24 + 24, 24)
        self.up1  = nn.ConvTranspose2d(24, 16, kernel_size=2, stride=2)
        self.dec1 = ConvBlock(16, 16)
        self.out  = nn.Conv2d(16, 1, kernel_size=1)

    def forward(self, x):
        e0 = self.enc0(x)
        e1 = self.enc1(e0)
        e2 = self.enc2(e1)
        e3 = self.enc3(e2)
        e4 = self.enc4(e3)
        e5 = self.enc5(e4)
        d5 = self.up5(e5)
        d5 = self._match_and_cat(d5, e4)
        d5 = self.dec5(d5)
        d4 = self.up4(d5)
        d4 = self._match_and_cat(d4, e3)
        d4 = self.dec4(d4)
        d3 = self.up3(d4)
        d3 = self._match_and_cat(d3, e2)
        d3 = self.dec3(d3)
        d2 = self.up2(d3)
        d2 = self._match_and_cat(d2, e1)
        d2 = self.dec2(d2)
        d1 = self.up1(d2)
        d1 = self.dec1(d1)
        return self.out(d1)

    def _match_and_cat(self, x, skip):
        if x.shape != skip.shape:
            x = F.interpolate(x, size=skip.shape[2:], mode="bilinear", align_corners=False)
        return torch.cat([x, skip], dim=1)


# ===== LOAD MODEL =====
print("Loading model...")
model = UNetEfficientB4().to(DEVICE)
model.load_state_dict(torch.load("best_nail_model.pth", map_location=DEVICE))
model.eval()
print(f"Model loaded on {DEVICE} ✅")


# ===== PREPROCESS + PREDICT =====
def preprocess(image_pil):
    img  = np.array(image_pil.convert("RGB"))
    img  = cv2.resize(img, (512, 512))
    mean = np.array([0.485, 0.456, 0.406])
    std  = np.array([0.229, 0.224, 0.225])
    img  = (img / 255.0 - mean) / std
    img  = torch.tensor(img, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0)
    return img.to(DEVICE)

def predict_mask(image_pil):
    original_size = image_pil.size
    tensor = preprocess(image_pil)
    with torch.no_grad():
        out  = model(tensor)
        prob = torch.sigmoid(out).squeeze().cpu().numpy()
    mask = (prob > 0.5).astype(np.uint8) * 255
    mask = cv2.resize(mask, original_size, interpolation=cv2.INTER_NEAREST)
    mask = cv2.GaussianBlur(mask, (7, 7), 0)
    return mask


# ===== NAIL COMPONENT DETECTION =====
def find_nail_components(mask_gray, W, H):
    """Returns per-nail bounding boxes sorted left to right."""
    binary     = (mask_gray > 30).astype(np.uint8)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        binary, connectivity=8
    )
    components = []
    min_area   = W * H * 0.0002
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] < min_area:
            continue
        components.append({
            "x":  stats[i, cv2.CC_STAT_LEFT],
            "y":  stats[i, cv2.CC_STAT_TOP],
            "w":  stats[i, cv2.CC_STAT_WIDTH],
            "h":  stats[i, cv2.CC_STAT_HEIGHT],
            "cx": centroids[i][0],
        })
    components.sort(key=lambda c: c["cx"])
    return components


# ===== COLOUR OVERLAY =====
def hex_to_rgb(hex_color: str):
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)

def apply_color_to_mask(image_pil, mask_np, hex_color: str, opacity: float = 0.82):
    img         = np.array(image_pil.convert("RGB")).astype(np.float32)
    r, g, b     = hex_to_rgb(hex_color)
    color_layer = np.full_like(img, [r, g, b], dtype=np.float32)
    alpha       = (mask_np.astype(np.float32) / 255.0) * opacity
    alpha       = np.stack([alpha, alpha, alpha], axis=-1)
    blended     = img * (1 - alpha) + color_layer * alpha
    return Image.fromarray(blended.clip(0, 255).astype(np.uint8))


# ===== PER-NAIL PATTERN MAPPING (THE FIX) =====
def apply_pattern_per_nail(image_pil, mask_np, pattern_pil, opacity: float = 0.88):
    """
    Maps the full pattern onto EACH nail individually.

    Algorithm per nail:
      1. Find nail bounding box via connected components
      2. Resize the FULL pattern to fit that nail's exact bbox dimensions
      3. Blend the resized pattern only within the nail's mask pixels

    Result: every nail shows the complete design, not a sliver of it.
    """
    W, H      = image_pil.size
    img_np    = np.array(image_pil.convert("RGB")).astype(np.float32)
    result_np = img_np.copy()
    pat_np    = np.array(pattern_pil.convert("RGB")).astype(np.float32)

    nail_boxes = find_nail_components(mask_np, W, H)

    for nb in nail_boxes:
        nx, ny, nw, nh = nb["x"], nb["y"], nb["w"], nb["h"]

        # Clamp box to image bounds
        x1 = max(nx, 0);       y1 = max(ny, 0)
        x2 = min(nx + nw, W);  y2 = min(ny + nh, H)
        bw = x2 - x1;          bh = y2 - y1
        if bw < 2 or bh < 2:
            continue

        # Resize full pattern to exactly this nail's size
        pat_resized = cv2.resize(pat_np, (bw, bh), interpolation=cv2.INTER_LANCZOS4)

        # Mask slice for this nail — drives per-pixel blend strength
        mask_slice = mask_np[y1:y2, x1:x2].astype(np.float32) / 255.0
        alpha      = (mask_slice * opacity)[..., np.newaxis]  # (bh, bw, 1)

        # Vectorised blend: only masked pixels get the pattern
        result_np[y1:y2, x1:x2] = (
            result_np[y1:y2, x1:x2] * (1.0 - alpha) + pat_resized * alpha
        )

    return Image.fromarray(result_np.clip(0, 255).astype(np.uint8))


# ===== ENCODE / DECODE =====
def pil_to_b64(pil_img: Image.Image, fmt="JPEG", quality=90) -> str:
    buf = io.BytesIO()
    pil_img.save(buf, format=fmt, quality=quality)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def b64_to_pil(b64_str: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64_str))).convert("RGB")


# ===== EXTENSION HELPERS =====
def get_nail_bounds(mask_gray, nail_box, W, H):
    x, y, w, h = nail_box["x"], nail_box["y"], nail_box["w"], nail_box["h"]
    row_min = max(0, y);  row_max = min(y + h, H)
    col_min = max(0, x);  col_max = min(x + w, W)

    tip_row = None;  tip_left  = x;  tip_right  = x + w
    bot_row = None;  base_left = x;  base_right = x + w

    for row in range(row_min, row_max):
        cols = [c for c in range(col_min, col_max) if mask_gray[row, c] > 30]
        if len(cols) >= 3:
            tip_row = row; tip_left = min(cols); tip_right = max(cols)
            break

    for row in range(row_max - 1, row_min - 1, -1):
        cols = [c for c in range(col_min, col_max) if mask_gray[row, c] > 30]
        if len(cols) >= 3:
            bot_row = row; base_left = min(cols); base_right = max(cols)
            break

    if tip_row is None: tip_row = y
    if bot_row is None: bot_row = y + h
    return tip_left, tip_right, tip_row, bot_row, base_left, base_right

def generate_extension_mask(nail_box, extension_px, shape, mask_gray, W, H):
    tip_left, tip_right, tip_row, bot_row, base_left, base_right = \
        get_nail_bounds(mask_gray, nail_box, W, H)

    nail_width = max(tip_right - tip_left, 1)
    cx         = (tip_left + tip_right) // 2
    new_top_y  = max(0, tip_row - extension_px)
    bl = [base_left, bot_row]
    br = [base_right, bot_row]

    ext_mask = np.zeros((H, W), dtype=np.uint8)

    if shape == "square":
        pts = np.array([bl, br, [tip_right, new_top_y], [tip_left, new_top_y]], dtype=np.int32)

    elif shape == "oval":
        a = nail_width // 2
        b = max((bot_row - new_top_y) // 2, 1)
        mid_y    = (bot_row + new_top_y) // 2
        pts_list = [bl, br]
        for s in range(21):
            angle = math.pi * s / 20
            pts_list.append([
                int(cx + a * math.cos(math.pi - angle)),
                int(mid_y - b * math.sin(angle)),
            ])
        pts = np.array(pts_list, dtype=np.int32)

    elif shape == "almond":
        taper = int(nail_width * 0.28)
        mid_y = tip_row - int(extension_px * 0.5)
        pts   = np.array([
            bl, br,
            [tip_right,           tip_row],
            [tip_right - taper,   mid_y],
            [cx,                  new_top_y],
            [tip_left  + taper,   mid_y],
            [tip_left,            tip_row],
        ], dtype=np.int32)

    elif shape == "stiletto":
        pts = np.array([
            bl, br,
            [tip_right, tip_row],
            [cx,        new_top_y],
            [tip_left,  tip_row],
        ], dtype=np.int32)

    elif shape == "coffin":
        flare       = int(nail_width * 0.08)
        flat_half   = int(nail_width * 0.28)
        flare_end_y = tip_row - int(extension_px * 0.45)
        pts = np.array([
            bl, br,
            [tip_right + flare,  tip_row],
            [tip_right + flare,  flare_end_y],
            [cx + flat_half,     new_top_y],
            [cx - flat_half,     new_top_y],
            [tip_left  - flare,  flare_end_y],
            [tip_left  - flare,  tip_row],
        ], dtype=np.int32)

    else:
        pts = np.array([bl, br, [tip_right, new_top_y], [tip_left, new_top_y]], dtype=np.int32)

    cv2.fillPoly(ext_mask, [pts], 255)
    return ext_mask

def apply_extension(image_np, mask_gray, extension_px, shape, color_hex=None):
    H, W = image_np.shape[:2]
    if mask_gray.shape != (H, W):
        mask_gray = cv2.resize(mask_gray, (W, H), interpolation=cv2.INTER_NEAREST)

    nail_boxes = find_nail_components(mask_gray, W, H)
    result     = image_np.copy()
    r, g, b    = hex_to_rgb(color_hex) if (color_hex and color_hex.startswith("#") and len(color_hex) == 7) else (240, 220, 210)

    for nb in nail_boxes:
        ext_mask = generate_extension_mask(nb, extension_px, shape, mask_gray, W, H)
        alpha    = ext_mask.astype(np.float32) / 255.0
        for c_idx, c_val in enumerate([r, g, b]):
            result[:, :, c_idx] = (
                result[:, :, c_idx] * (1.0 - alpha) + c_val * alpha
            ).astype(np.uint8)
    return result


# ===== ROUTES =====

@app.route("/")
def health():
    return jsonify({
        "status": "NailGlow API running ✅",
        "endpoints": ["/apply", "/segment", "/extend"]
    })


# ── /apply ────────────────────────────────────────────────────────────────────
@app.route("/apply", methods=["POST"])
def apply_design():
    """
    multipart/form-data:
        image   : hand photo              (required)
        color   : hex e.g. #E84E7A        (optional)
        pattern : design image file       (optional, takes priority over color)
        opacity : float 0-1              (default 0.82)

    Pattern is mapped per nail — each nail gets the FULL design fitted to it.
    Returns: { "result": "<base64 JPEG>" }
    """
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    image        = Image.open(request.files["image"].stream)
    opacity      = float(request.form.get("opacity", 0.82))
    color        = request.form.get("color", "").strip()
    pattern_file = request.files.get("pattern")

    mask = predict_mask(image)

    if pattern_file:
        pattern_img = Image.open(pattern_file.stream)
        result      = apply_pattern_per_nail(image, mask, pattern_img, opacity)
    elif color:
        result = apply_color_to_mask(image, mask, color, opacity)
    else:
        return jsonify({"error": "Provide either 'color' or 'pattern'"}), 400

    return jsonify({"result": pil_to_b64(result)})


# ── /segment ──────────────────────────────────────────────────────────────────
@app.route("/segment", methods=["POST"])
def segment():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    image = Image.open(request.files["image"].stream)
    mask  = predict_mask(image)
    return jsonify({
        "mask": pil_to_b64(Image.fromarray(mask.astype(np.uint8)), fmt="PNG")
    })


# ── /extend ───────────────────────────────────────────────────────────────────
@app.route("/extend", methods=["POST"])
def extend():
    """
    JSON: { image_b64, mask_b64, shape, length_px, color? }
    Returns: { "result": "<base64 JPEG>" }
    """
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "JSON body required"}), 400
    for field in ["image_b64", "mask_b64", "shape", "length_px"]:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400
    try:
        image_pil = b64_to_pil(data["image_b64"])
        mask_gray = np.array(b64_to_pil(data["mask_b64"]).convert("L"))
        image_np  = np.array(image_pil)
        shape     = data["shape"]
        length_px = max(5, min(int(data["length_px"]), 250))
        color     = data.get("color", "#F0DCD2")
        result_np = apply_extension(image_np, mask_gray, length_px, shape, color)
        return jsonify({"result": pil_to_b64(Image.fromarray(result_np))})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── Serve design PNGs ─────────────────────────────────────────────────────────
@app.route("/<int:file_num>.png")
def serve_design(file_num):
    filepath = os.path.join(os.path.dirname(__file__), f"{file_num}.png")
    if os.path.exists(filepath):
        return send_file(filepath, mimetype="image/png")
    return "File not found", 404


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)