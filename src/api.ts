import { GenerationOptions, GenerationResponse } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function generateMCQs(
  file: File,
  options: GenerationOptions
): Promise<GenerationResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    const response = await fetch(`${API_URL}/generate-mcq`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized: Please check your API key and permissions');
      }
      
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in generateMCQs:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
    }
    throw error;
  }
}

export async function generateNextBatch(
  options: GenerationOptions
): Promise<GenerationResponse> {
  try {
    const response = await fetch(`${API_URL}/generate-next-batch`, {
      method: 'POST',
      body: JSON.stringify({ options }),
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized: Please check your API key and permissions');
      }
      
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in generateNextBatch:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
    }
    throw error;
  }
}