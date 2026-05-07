import axios from 'axios';

const BASE_URL = 'https://your-render-backend.onrender.com'; // Replace with your Render URL

const api = axios.create({ baseURL: BASE_URL, timeout: 30_000 });

/** Upload hand image for nail segmentation */
export async function uploadHandImage(imageUri: string): Promise<{ jobId: string }> {
  const formData = new FormData();
  formData.append('image', { uri: imageUri, name: 'hand.jpg', type: 'image/jpeg' } as any);
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/** Poll result for a given job */
export async function fetchResult(jobId: string): Promise<{ resultUrl: string }> {
  const { data } = await api.get(`/result/${jobId}`);
  return data;
}

/** Apply nail design with selected style + color */
export async function applyNailDesign(params: {
  jobId: string;
  color: string;
  style: string;
  design: string;
}): Promise<{ resultUrl: string }> {
  const { data } = await api.post('/apply', params);
  return data;
}
