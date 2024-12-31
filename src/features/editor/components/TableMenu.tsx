import React from 'react';
import { type Editor as CoreEditor } from '@tiptap/core';
import { BiTrash, BiPlus, BiMinus, BiMerge } from 'react-icons/bi';

interface TableMenuProps {
    editor: CoreEditor;
}

export function TableMenu({ editor }: TableMenuProps) {
    const isTableActive = editor.isActive('table');
    const isCellSelection = editor.view.state.selection.type === 'cell';
    const canMergeCells = editor.can().mergeCells();
    const canSplitCell = editor.can().splitCell();

    if (!isTableActive && !isCellSelection) return null;

    return (
        <div className="table-menu">
            <div className="table-menu-group">
                <button
                    onClick={() => editor.chain().focus().addColumnBefore().run()}
                    className="table-menu-button"
                    data-tooltip="Add column before"
                >
                    <BiPlus /> Left
                </button>
                <button
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                    className="table-menu-button"
                    data-tooltip="Add column after"
                >
                    <BiPlus /> Right
                </button>
                <button
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                    className="table-menu-button"
                    data-tooltip="Delete column"
                >
                    <BiMinus /> Column
                </button>
            </div>
            <div className="table-menu-group">
                <button
                    onClick={() => editor.chain().focus().addRowBefore().run()}
                    className="table-menu-button"
                    data-tooltip="Add row before"
                >
                    <BiPlus /> Above
                </button>
                <button
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                    className="table-menu-button"
                    data-tooltip="Add row after"
                >
                    <BiPlus /> Below
                </button>
                <button
                    onClick={() => editor.chain().focus().deleteRow().run()}
                    className="table-menu-button"
                    data-tooltip="Delete row"
                >
                    <BiMinus /> Row
                </button>
            </div>
            <div className="table-menu-group">
                <button
                    onClick={() => editor.chain().focus().mergeCells().run()}
                    className={`table-menu-button ${!canMergeCells ? 'disabled' : ''}`}
                    disabled={!canMergeCells}
                    data-tooltip={canMergeCells ? "Merge cells" : "Select multiple cells to merge"}
                >
                    <BiMerge /> Merge
                </button>
                <button
                    onClick={() => editor.chain().focus().splitCell().run()}
                    className={`table-menu-button ${!canSplitCell ? 'disabled' : ''}`}
                    disabled={!canSplitCell}
                    data-tooltip={canSplitCell ? "Split cell" : "Select a merged cell to split"}
                >
                    <BiMerge style={{ transform: 'rotate(180deg)' }} /> Split
                </button>
                <button
                    onClick={() => editor.chain().focus().deleteTable().run()}
                    className="table-menu-button delete"
                    data-tooltip="Delete table"
                >
                    <BiTrash /> Table
                </button>
            </div>
        </div>
    );
} 