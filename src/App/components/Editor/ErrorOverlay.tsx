import React from "react";
import "./ErrorOverlay.css";

type ErrorOverlayProps = {
    error: string | null | undefined;
};

export function ErrorOverlay({error}: ErrorOverlayProps) {
    if (!error) return null;

    return (
        <div className="error-overlay">
            <div className="error-content">
                <h3>Error</h3>
                <p>{error}</p>
            </div>
        </div>
    );
} 