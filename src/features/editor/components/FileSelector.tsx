import React from 'react'
import { convertMdToJson } from '../services/fileSystemService'

interface FileSelectorProps {
  onFileSelect: (content: any) => void;
}

export function FileSelector({ onFileSelect }: FileSelectorProps): JSX.Element {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.md')) {
      alert('Please select a Markdown (.md) file');
      return;
    }

    try {
      const text = await file.text();
      const jsonContent = await convertMdToJson(text);
      const parsedContent = JSON.parse(jsonContent);
      onFileSelect(parsedContent);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing the markdown file. Please try again.');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleNewDocument = () => {
    const blankDocument = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: []
      }]
    };
    onFileSelect(blankDocument);
  };

  return (
    <div className="file-selector">
      <p>Select a file to begin editing</p>
      <div className="file-input-wrapper">
        <div className="button-stack">
          <button onClick={handleClick} className="file-input-button">
            Choose File
          </button>
          <button onClick={handleNewDocument} className="file-input-button">
            New Document
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md"
            onChange={handleFileChange}
            className="file-input-hidden"
          />
        </div>
      </div>
    </div>
  );
} 