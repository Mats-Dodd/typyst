import React, { useState } from "react"
import { useCurrentEditor } from "@tiptap/react"
import { 
    BiBold, 
    BiItalic, 
    BiStrikethrough, 
    BiListUl, 
    BiListOl,
    BiAlignLeft,
    BiAlignMiddle,
    BiAlignRight,
    BiAlignJustify,
    BiAlignLeft as BiAlign,
    BiUndo,
    BiRedo,
    BiSun,
    BiMoon,
    BiCodeAlt
} from "react-icons/bi"
import { useTheme } from "../../theme/themeContext"
import "../../../styles/MenuBar.css"
import { convertJsonToMd, convertJsonToDocx, renameFile } from "../services/fileSystemService"
import { BranchControls } from '../../versioning/components/BranchControls';

interface MenuBarProps {
    currentFilePath?: string
    onFileNameChange?: (newPath: string) => void
}

export function MenuBar({ currentFilePath, onFileNameChange }: MenuBarProps) {
    const { editor } = useCurrentEditor()
    const [showAlignMenu, setShowAlignMenu] = useState(false)
    const [isEditingFileName, setIsEditingFileName] = useState(false)
    const [editedFileName, setEditedFileName] = useState("")
    const { theme, toggleTheme } = useTheme()

    const getFileName = (filePath: string) => {
        const parts = filePath.split(/[/\\]/)
        const fullName = parts[parts.length - 1] || ''
        // Remove the extension
        return fullName.replace(/\.[^/.]+$/, '')
    }

    const getFileExtension = (filePath: string) => {
        const match = filePath.match(/\.[^/.]+$/)
        return match ? match[0] : ''
    }

    const getDirectory = (filePath: string) => {
        const lastSlashIndex = filePath.lastIndexOf('/')
        if (lastSlashIndex === -1) {
            const lastBackslashIndex = filePath.lastIndexOf('\\')
            return lastBackslashIndex === -1 ? '' : filePath.slice(0, lastBackslashIndex)
        }
        return filePath.slice(0, lastSlashIndex)
    }

    const displayFileName = currentFilePath ? getFileName(currentFilePath) : "Untitled"

    const handleFileNameClick = () => {
        if (currentFilePath) {
            const fileName = getFileName(currentFilePath)
            if (fileName) {
                setEditedFileName(fileName)
                setIsEditingFileName(true)
            }
        }
    }

    const handleFileNameSubmit = async () => {
        if (currentFilePath && editedFileName && onFileNameChange && editor) {
            const directory = getDirectory(currentFilePath)
            const extension = getFileExtension(currentFilePath)
            const newPath = directory 
                ? `${directory}/${editedFileName}${extension}`
                : `${editedFileName}${extension}`
            
            try {
                const success = await renameFile(currentFilePath, newPath, editor.getJSON())
                if (success) {
                    onFileNameChange(newPath)
                } else {
                    alert('Failed to rename file. Please try again.')
                }
            } catch (error) {
                console.error('Error renaming file:', error)
                alert('Error renaming file. Please try again.')
            }
        }
        setIsEditingFileName(false)
    }

    const handleFileNameKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault() // Prevent default to avoid potential form submission
            await handleFileNameSubmit()
        } else if (e.key === 'Escape') {
            setIsEditingFileName(false)
        }
    }

    if (!editor)
        return null

    const alignmentOptions = [
        { icon: BiAlignLeft, value: 'left', tooltip: 'Align Left (⌘⇧L)' },
        { icon: BiAlignMiddle, value: 'center', tooltip: 'Align Center (⌘⇧E)' },
        { icon: BiAlignRight, value: 'right', tooltip: 'Align Right (⌘⇧R)' },
        { icon: BiAlignJustify, value: 'justify', tooltip: 'Justify (⌘⇧J)' },
    ]

    const handleAlignment = (alignment: string) => {
        editor.chain().focus().setTextAlign(alignment).run()
        setShowAlignMenu(false)
    }

    return (
        <div className="control-group">
            <div className="button-group">
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="menu-button"
                    data-tooltip="Undo (⌘Z)"
                >
                    <BiUndo />
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="menu-button"
                    data-tooltip="Redo (⌘⇧Z)"
                >
                    <BiRedo />
                </button>
                <div className="separator" />
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`menu-button ${editor.isActive("bold") ? "is-active" : ""}`}
                    data-tooltip="Bold (⌘B)"
                >
                    <BiBold />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`menu-button ${editor.isActive("italic") ? "is-active" : ""}`}
                    data-tooltip="Italic (⌘I)"
                >
                    <BiItalic />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`menu-button ${editor.isActive("strike") ? "is-active" : ""}`}
                    data-tooltip="Strikethrough (⌘⇧X)"
                >
                    <BiStrikethrough />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`menu-button ${editor.isActive("bulletList") ? "is-active" : ""}`}
                    data-tooltip="Bullet List (⌘⇧8)"
                >
                    <BiListUl />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`menu-button ${editor.isActive("orderedList") ? "is-active" : ""}`}
                    data-tooltip="Ordered List (⌘⇧7)"
                >
                    <BiListOl />
                </button>
                <div className="menu-dropdown">
                    <button
                        onClick={() => setShowAlignMenu(!showAlignMenu)}
                        className="menu-button"
                        data-tooltip="Text Alignment"
                    >
                        <BiAlign />
                    </button>
                    {showAlignMenu && (
                        <div className="dropdown-menu">
                            {alignmentOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleAlignment(option.value)}
                                    className={`menu-button ${editor.isActive({ textAlign: option.value }) ? "is-active" : ""}`}
                                    data-tooltip={option.tooltip}
                                >
                                    <option.icon />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="separator" />
                <button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`menu-button ${editor.isActive('codeBlock') ? "is-active" : ""}`}
                    data-tooltip="Code Block"
                >
                    <BiCodeAlt />
                </button>
                <div className="separator" />
                <div className="menu-section">
                    <BranchControls editor={editor} currentFilePath={currentFilePath} />
                </div>
            </div>
            <div className="file-name-container">
                {isEditingFileName ? (
                    <input
                        type="text"
                        className="file-name-input"
                        value={editedFileName}
                        onChange={(e) => setEditedFileName(e.target.value)}
                        onBlur={handleFileNameSubmit}
                        onKeyDown={handleFileNameKeyDown}
                        autoFocus
                    />
                ) : (
                    <div 
                        className="file-name-display"
                        onClick={handleFileNameClick}
                        title="Click to rename"
                    >
                        {displayFileName}
                    </div>
                )}
            </div>
            <button
                onClick={toggleTheme}
                className="menu-button theme-toggle"
                data-tooltip={`${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
                {theme === 'light' ? <BiMoon /> : <BiSun />}
            </button>
        </div>
    )
} 