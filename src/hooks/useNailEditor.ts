import { useState } from 'react';

export interface NailEditorState {
  imageUri: string | null;
  selectedColor: string;
  selectedStyle: string;
  selectedDesign: string;
  resultUri: string | null;
  isLoading: boolean;
}

const INITIAL_STATE: NailEditorState = {
  imageUri: null,
  selectedColor: '#C2185B',
  selectedStyle: 'Monochrome',
  selectedDesign: 'Plain',
  resultUri: null,
  isLoading: false,
};

export function useNailEditor() {
  const [state, setState] = useState<NailEditorState>(INITIAL_STATE);

  const setImageUri = (uri: string) => setState(s => ({ ...s, imageUri: uri }));
  const setColor = (color: string) => setState(s => ({ ...s, selectedColor: color }));
  const setStyle = (style: string) => setState(s => ({ ...s, selectedStyle: style }));
  const setDesign = (design: string) => setState(s => ({ ...s, selectedDesign: design }));
  const setResult = (uri: string) => setState(s => ({ ...s, resultUri: uri }));
  const setLoading = (isLoading: boolean) => setState(s => ({ ...s, isLoading }));
  const reset = () => setState(INITIAL_STATE);

  return { state, setImageUri, setColor, setStyle, setDesign, setResult, setLoading, reset };
}
