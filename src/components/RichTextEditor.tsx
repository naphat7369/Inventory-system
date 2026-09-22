"use client";

import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function RichTextEditor({ value, onChange, disabled }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Only update if not currently focused to prevent cursor jumping
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    handleInput();
  };

  return (
    <div className={`border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="bg-gray-50 dark:bg-slate-800 border-b border-gray-300 dark:border-slate-600 p-2 flex flex-wrap gap-1">
        <button type="button" onClick={() => execCommand('bold')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300" title="Bold">
          <Bold size={16} />
        </button>
        <button type="button" onClick={() => execCommand('italic')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300" title="Italic">
          <Italic size={16} />
        </button>
        <button type="button" onClick={() => execCommand('underline')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300" title="Underline">
          <Underline size={16} />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 mx-1 self-center"></div>
        <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300" title="Bullet List">
          <List size={16} />
        </button>
        <button type="button" onClick={() => execCommand('insertOrderedList')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300" title="Numbered List">
          <ListOrdered size={16} />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 mx-1 self-center"></div>
        <button type="button" onClick={() => execCommand('justifyLeft')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300" title="Align Left">
          <AlignLeft size={16} />
        </button>
        <button type="button" onClick={() => execCommand('justifyCenter')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300" title="Align Center">
          <AlignCenter size={16} />
        </button>
        <button type="button" onClick={() => execCommand('justifyRight')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300" title="Align Right">
          <AlignRight size={16} />
        </button>
        <button type="button" onClick={() => execCommand('justifyFull')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300" title="Justify">
          <AlignJustify size={16} />
        </button>
      </div>
      <div 
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onBlur={handleInput}
        className="min-h-[300px] p-4 bg-white dark:bg-slate-900 focus:outline-none prose max-w-none dark:prose-invert"
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  );
}
