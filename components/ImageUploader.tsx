
import React from 'react';
import { LectureImage } from '../types';

interface Props {
  onImagesSelected: (images: LectureImage[]) => void;
  images: LectureImage[];
}

export const ImageUploader: React.FC<Props> = ({ onImagesSelected, images }) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages: LectureImage[] = await Promise.all(
      files.map(file => new Promise<LectureImage>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            id: Math.random().toString(36).substr(2, 9),
            data: event.target?.result as string,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      }))
    );

    onImagesSelected([...images, ...newImages]);
  };

  const removeImage = (id: string) => {
    onImagesSelected(images.filter(img => img.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {images.map((img) => (
          <div key={img.id} className="relative group">
            <img src={img.data} alt="Lecture" className="w-24 h-24 object-cover rounded-xl border-4 border-white shadow-md" />
            <button 
              onClick={() => removeImage(img.id)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        {images.length < 3 && (
          <label className="w-24 h-24 flex flex-col items-center justify-center border-4 border-dashed border-sky-300 rounded-xl bg-white hover:bg-sky-50 cursor-pointer transition-colors">
            <svg className="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[10px] font-bold text-sky-500 uppercase">Add Page</span>
            <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
          </label>
        )}
      </div>
      <p className="text-xs text-sky-600 font-medium">Capture 1-3 pages of your teacher's lecture notes!</p>
    </div>
  );
};
