import {CSSProperties} from "react";
import classNames from "classnames";

import "./Header.css";

export function Header({loadPercentage}: HeaderProps) {
    return <div className="appHeader">
        <div className="panel model">
            <div
                className={classNames("progress", loadPercentage === 1 && "hide")}
                style={{
                    "--progress": loadPercentage != null ? (loadPercentage * 100) : undefined
                } as CSSProperties}
            />
        </div>
    </div>;
}

type HeaderProps = {
    loadPercentage?: number
};
