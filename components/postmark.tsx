"use client";

import React from "react";

export type PostmarkStyle =
  "classic-wavy" | "double-circle" | "airmail-triangle" | "bars-only";

export type PostmarkProps = {
  style?: PostmarkStyle;
  city?: string;
  date?: string;
  inkColor?: string;
  opacity?: number;
  rotation?: number;
  scale?: number;
  className?: string;
};

export function Postmark({
  style = "classic-wavy",
  city = "PARIS R.P.",
  date = "18.X.26",
  inkColor = "#1a1a1a",
  opacity = 0.82,
  rotation = -14,
  scale = 1,
  className = "",
}: PostmarkProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden mix-blend-multiply transition-transform duration-150 select-none ${className}`}
      style={{
        transform: `rotate(${rotation}deg) scale(${scale})`,
        opacity,
      }}
      aria-hidden="true"
    >
      {style === "classic-wavy" && (
        <svg
          viewBox="0 0 320 180"
          className="w-[140%] max-w-none text-current"
          style={{ color: inkColor }}
          fill="none"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Circular dial on the left */}
          <g strokeWidth="2.4" strokeLinecap="round">
            <circle cx="85" cy="90" r="48" stroke="currentColor" />
            <circle
              cx="85"
              cy="90"
              r="44"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2 2"
            />

            {/* Arched text paths */}
            <path
              id="circle-arc-top"
              d="M 45 90 A 40 40 0 0 1 125 90"
              fill="none"
              stroke="none"
            />
            <path
              id="circle-arc-bottom"
              d="M 125 90 A 40 40 0 0 1 45 90"
              fill="none"
              stroke="none"
            />

            <text
              fontSize="8.5"
              fontFamily="monospace, sans-serif"
              fontWeight="bold"
              fill="currentColor"
              letterSpacing="2"
            >
              <textPath
                href="#circle-arc-top"
                startOffset="50%"
                textAnchor="middle"
              >
                {city.toUpperCase()}
              </textPath>
            </text>

            <text
              x="85"
              y="93"
              fontSize="10.5"
              fontFamily="monospace, sans-serif"
              fontWeight="900"
              fill="currentColor"
              textAnchor="middle"
              letterSpacing="1"
            >
              {date}
            </text>

            <text
              fontSize="7.5"
              fontFamily="monospace, sans-serif"
              fontWeight="bold"
              fill="currentColor"
              letterSpacing="2"
            >
              <textPath
                href="#circle-arc-bottom"
                startOffset="50%"
                textAnchor="middle"
              >
                ★ POSTE ★
              </textPath>
            </text>
          </g>

          {/* 7 Wavy cancellation lines extending to the right */}
          <g strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 140 50 Q 170 38 200 50 T 260 50 T 315 50" />
            <path d="M 140 64 Q 170 52 200 64 T 260 64 T 315 64" />
            <path d="M 140 78 Q 170 66 200 78 T 260 78 T 315 78" />
            <path d="M 140 92 Q 170 80 200 92 T 260 92 T 315 92" />
            <path d="M 140 106 Q 170 94 200 106 T 260 106 T 315 106" />
            <path d="M 140 120 Q 170 108 200 120 T 260 120 T 315 120" />
            <path d="M 140 134 Q 170 122 200 134 T 260 134 T 315 134" />
          </g>
        </svg>
      )}

      {style === "double-circle" && (
        <svg
          viewBox="0 0 200 200"
          className="w-[110%] max-w-none text-current"
          style={{ color: inkColor }}
          fill="none"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g strokeWidth="2.5" strokeLinecap="round">
            <circle cx="100" cy="100" r="75" stroke="currentColor" />
            <circle
              cx="100"
              cy="100"
              r="58"
              stroke="currentColor"
              strokeWidth="1.5"
            />

            <path
              id="double-arc-top"
              d="M 35 100 A 65 65 0 0 1 165 100"
              fill="none"
              stroke="none"
            />
            <path
              id="double-arc-bottom"
              d="M 165 100 A 65 65 0 0 1 35 100"
              fill="none"
              stroke="none"
            />

            <text
              fontSize="10"
              fontFamily="monospace, sans-serif"
              fontWeight="900"
              fill="currentColor"
              letterSpacing="3"
            >
              <textPath
                href="#double-arc-top"
                startOffset="50%"
                textAnchor="middle"
              >
                {city.toUpperCase()}
              </textPath>
            </text>

            <line
              x1="45"
              y1="88"
              x2="155"
              y2="88"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <text
              x="100"
              y="104"
              fontSize="13"
              fontFamily="monospace, sans-serif"
              fontWeight="900"
              fill="currentColor"
              textAnchor="middle"
              letterSpacing="1"
            >
              {date}
            </text>
            <line
              x1="45"
              y1="112"
              x2="155"
              y2="112"
              stroke="currentColor"
              strokeWidth="1.2"
            />

            <text
              fontSize="9"
              fontFamily="monospace, sans-serif"
              fontWeight="bold"
              fill="currentColor"
              letterSpacing="3"
            >
              <textPath
                href="#double-arc-bottom"
                startOffset="50%"
                textAnchor="middle"
              >
                OFFICIAL MAIL
              </textPath>
            </text>
          </g>
        </svg>
      )}

      {style === "airmail-triangle" && (
        <svg
          viewBox="0 0 220 180"
          className="w-[110%] max-w-none text-current"
          style={{ color: inkColor }}
          fill="none"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="110,20 200,160 20,160" stroke="currentColor" />
            <polygon
              points="110,32 185,150 35,150"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="3 2"
            />

            <text
              x="110"
              y="75"
              fontSize="11"
              fontFamily="sans-serif"
              fontWeight="900"
              fill="currentColor"
              letterSpacing="3"
              textAnchor="middle"
            >
              AIR MAIL
            </text>
            <text
              x="110"
              y="100"
              fontSize="9"
              fontFamily="monospace, sans-serif"
              fontWeight="bold"
              fill="currentColor"
              letterSpacing="2"
              textAnchor="middle"
            >
              {city.toUpperCase()}
            </text>
            <text
              x="110"
              y="125"
              fontSize="11"
              fontFamily="monospace, sans-serif"
              fontWeight="900"
              fill="currentColor"
              letterSpacing="1"
              textAnchor="middle"
            >
              {date}
            </text>
            <text
              x="110"
              y="142"
              fontSize="7.5"
              fontFamily="monospace, sans-serif"
              fontWeight="bold"
              fill="currentColor"
              letterSpacing="2"
              textAnchor="middle"
            >
              PAR AVION
            </text>
          </g>
        </svg>
      )}

      {style === "bars-only" && (
        <svg
          viewBox="0 0 280 140"
          className="w-[130%] max-w-none text-current"
          style={{ color: inkColor }}
          fill="none"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 20 25 Q 75 10 140 25 T 260 25" />
            <path d="M 20 45 Q 75 30 140 45 T 260 45" />
            <path d="M 20 65 Q 75 50 140 65 T 260 65" />
            <path d="M 20 85 Q 75 70 140 85 T 260 85" />
            <path d="M 20 105 Q 75 90 140 105 T 260 105" />
            <path d="M 20 125 Q 75 110 140 125 T 260 125" />
          </g>
        </svg>
      )}
    </div>
  );
}
