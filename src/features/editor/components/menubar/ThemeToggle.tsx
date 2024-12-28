import React from 'react';
import { BiMoon, BiSun } from 'react-icons/bi';
import type { ThemeToggleProps } from '../../types/menubar';
import styles from '../../../../styles/menubar/MenuBar.module.css';

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
    return (
        <button
            onClick={toggleTheme}
            className={`${styles['menu-button']} ${styles['theme-toggle']}`}
            data-tooltip={`${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
            {theme === 'light' ? <BiMoon /> : <BiSun />}
        </button>
    );
}; 