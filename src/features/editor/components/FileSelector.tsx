import React from 'react'
import { convertMdToJson, convertDocxToJson } from '../services/fileSystemService'

interface FileSelectorProps {
  onFileSelect: (content: any, filePath?: string) => void;
}

export function FileSelector({ onFileSelect }: FileSelectorProps): JSX.Element {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const isMarkdown = file.name.endsWith('.md');
    const isDocx = file.name.endsWith('.docx');

    if (!isMarkdown && !isDocx) {
      alert('Please select either a Markdown (.md) or Word (.docx) file');
      return;
    }

    try {
      console.log('Selected file:', file);
      let jsonContent: string;
      
      // Use the file name as the path for now
      const filePath = `files/${file.name}`;
      console.log('Using file path:', filePath);

      if (isMarkdown) {
        const text = await file.text();
        jsonContent = await convertMdToJson(text);
      } else {
        const buffer = await file.arrayBuffer();
        jsonContent = await convertDocxToJson(buffer);
      }
      const parsedContent = JSON.parse(jsonContent);
      onFileSelect(parsedContent, filePath);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing the file. Please try again.');
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
            accept=".md,.docx"
            onChange={handleFileChange}
            className="file-input-hidden"
          />
        </div>
      </div>
    </div>
  );
} 