import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Extension } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Palette,
} from 'lucide-react';

// Extensión personalizada para FontSize
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

interface EditorTextoProps {
  value: string;
  onChange: (html: string) => void;
  darkMode?: boolean;
  placeholder?: string;
  showImageButton?: boolean;
  minHeight?: string;
}

export default function EditorTexto({
  value,
  onChange,
  darkMode = false,
  placeholder = 'Escribe aquí...',
  showImageButton = true,
  minHeight = '200px',
}: EditorTextoProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Placeholder.configure({
        placeholder: placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose max-w-none focus:outline-none px-4 py-3 ${
          darkMode ? 'prose-invert text-white' : 'text-gray-900'
        }`,
      },
    },
  });

  // Sincronizar el contenido del editor cuando value cambie externamente
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const imgElement = document.createElement('img') as HTMLImageElement;
        imgElement.onload = () => {
          const canvas = document.createElement('canvas');
          let width = imgElement.width;
          let height = imgElement.height;
          
          // Limitar el ancho máximo a 800px manteniendo la proporción
          const maxWidth = 800;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(imgElement, 0, 0, width, height);
            
            // Convertir a base64 con calidad optimizada
            const optimizedUrl = canvas.toDataURL('image/jpeg', 0.85);
            editor.chain().focus().setImage({ src: optimizedUrl }).run();
          }
        };
        imgElement.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const alignText = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    editor.chain().focus().setTextAlign(alignment).run();
  };

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL:', previousUrl || 'https://');

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const setFontSize = (size: string) => {
    if (size === '') {
      editor.chain().focus().unsetFontSize().run();
    } else {
      editor.chain().focus().setFontSize(size).run();
    }
  };

  const setTextColor = (color: string) => {
    if (color === '') {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
  };

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    title,
    disabled = false,
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode; 
    title: string;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded transition-colors ${
        disabled 
          ? 'opacity-50 cursor-not-allowed'
          : isActive 
          ? 'bg-teal-500 text-white' 
          : darkMode 
          ? 'hover:bg-slate-700 text-gray-300' 
          : 'hover:bg-gray-200 text-gray-700'
      }`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full">
      {/* Barra de herramientas */}
      <div
        className={`flex flex-wrap items-center gap-1 p-2 rounded-t-lg border ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300'
        }`}
      >
        {/* Tamaño de letra */}
        <div className="flex items-center gap-1 mr-1">
          <Type className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <select
            onChange={(e) => setFontSize(e.target.value)}
            className={`px-2 py-1 rounded text-sm border ${
              darkMode 
                ? 'bg-slate-700 border-slate-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-1 focus:ring-teal-500`}
            title="Tamaño de fuente"
          >
            <option value="">Tamaño</option>
            <option value="0.625rem">10</option>
            <option value="0.75rem">12</option>
            <option value="0.875rem">14</option>
            <option value="1rem">16 (Normal)</option>
            <option value="1.125rem">18</option>
            <option value="1.25rem">20</option>
            <option value="1.5rem">24</option>
            <option value="1.75rem">28</option>
            <option value="2rem">32</option>
            <option value="2.25rem">36</option>
            <option value="3rem">48</option>
            <option value="4rem">64</option>
          </select>
        </div>

        {/* Color de texto */}
        <div className="flex items-center gap-1 mr-1">
          <Palette className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <input
            type="color"
            onChange={(e) => setTextColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0"
            title="Color de texto"
          />
          <select
            onChange={(e) => setTextColor(e.target.value)}
            className={`px-2 py-1 rounded text-sm border ${
              darkMode 
                ? 'bg-slate-700 border-slate-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-1 focus:ring-teal-500`}
            title="Colores predefinidos"
          >
            <option value="">Color</option>
            <option value="#000000">⚫ Negro</option>
            <option value="#ff0000">🔴 Rojo</option>
            <option value="#00ff00">🟢 Verde</option>
            <option value="#0000ff">🔵 Azul</option>
            <option value="#ffff00">🟡 Amarillo</option>
            <option value="#ff00ff">🟣 Magenta</option>
            <option value="#00ffff">🔵 Cian</option>
            <option value="#ffa500">🟠 Naranja</option>
            <option value="#800080">🟣 Púrpura</option>
            <option value="#808080">⚪ Gris</option>
            <option value="#ffffff">⚪ Blanco</option>
          </select>
        </div>

        <div className={`w-px h-6 ${darkMode ? 'bg-slate-600' : 'bg-gray-400'}`} />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Negrita (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Cursiva (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Subrayado (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Tachado"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <div className={`w-px h-6 ${darkMode ? 'bg-slate-600' : 'bg-gray-400'}`} />

        <ToolbarButton
          onClick={() => alignText('left')}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Alinear izquierda"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => alignText('center')}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Centrar"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => alignText('right')}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Alinear derecha"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => alignText('justify')}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justificar"
        >
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>

        <div className={`w-px h-6 ${darkMode ? 'bg-slate-600' : 'bg-gray-400'}`} />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Lista con viñetas"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className={`w-px h-6 ${darkMode ? 'bg-slate-600' : 'bg-gray-400'}`} />

        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive('link')}
          title="Insertar enlace"
        >
          <Link2 className="w-4 h-4" />
        </ToolbarButton>
        
        {showImageButton && (
          <ToolbarButton onClick={addImage} title="Insertar imagen">
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
        )}
      </div>

      {/* Editor */}
      <div
        className={`rounded-b-lg border border-t-0 ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'
        }`}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Estilos */}
      <style>{`
        .ProseMirror {
          min-height: ${minHeight};
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: '${placeholder}';
          color: ${darkMode ? '#6b7280' : '#9ca3af'};
          pointer-events: none;
          height: 0;
          float: left;
        }
        
        .ProseMirror img,
        .ProseMirror .editor-image {
          max-width: 100%;
          max-height: 600px;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 8px;
          margin: 12px 0;
          cursor: pointer;
          transition: transform 0.2s;
          display: inline-block;
          vertical-align: middle;
        }
        
        .ProseMirror p {
          margin: 0;
        }
        
        /* Alineación izquierda */
        .ProseMirror p[style*="text-align: left"],
        .ProseMirror div[style*="text-align: left"] {
          text-align: left !important;
        }
        
        .ProseMirror p[style*="text-align: left"] img,
        .ProseMirror div[style*="text-align: left"] img {
          display: inline-block;
          margin-left: 0;
          margin-right: auto;
        }
        
        /* Alineación centrada */
        .ProseMirror p[style*="text-align: center"],
        .ProseMirror div[style*="text-align: center"] {
          text-align: center !important;
        }

        .ProseMirror p[style*="text-align: center"] img,
        .ProseMirror div[style*="text-align: center"] img {
          display: inline-block;
          margin-left: auto;
          margin-right: auto;
        }
        
        /* Alineación derecha */
        .ProseMirror p[style*="text-align: right"],
        .ProseMirror div[style*="text-align: right"] {
          text-align: right !important;
        }

        .ProseMirror p[style*="text-align: right"] img,
        .ProseMirror div[style*="text-align: right"] img {
          display: inline-block;
          margin-left: auto;
          margin-right: 0;
        }
        
        /* Alineación justificada */
        .ProseMirror p[style*="text-align: justify"],
        .ProseMirror div[style*="text-align: justify"] {
          text-align: justify !important;
        }
        
        .ProseMirror p[style*="text-align: justify"] img,
        .ProseMirror div[style*="text-align: justify"] img {
          display: inline-block;
          margin-left: 0;
          margin-right: auto;
        }

        
        .ProseMirror img:hover {
          transform: scale(1.02);
        }
        
        .ProseMirror img.ProseMirror-selectednode {
          outline: 3px solid #14b8a6;
          outline-offset: 2px;
        }

        .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror a:hover {
          color: #2563eb;
        }
        
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 2em !important;
          margin: 0.5em 0 !important;
          list-style-position: outside !important;
        }
        
        .ProseMirror ul {
          list-style-type: disc !important;
        }
        
        .ProseMirror ol {
          list-style-type: decimal !important;
        }
        
        .ProseMirror li {
          display: list-item !important;
          margin: 0.25em 0 !important;
        }
        
        .ProseMirror ul li {
          list-style-type: disc !important;
        }
        
        .ProseMirror ol li {
          list-style-type: decimal !important;
        }
      `}</style>
    </div>
  );
}