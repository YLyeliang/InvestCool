"use client";

import React, { useState, useEffect } from "react";

export const ReadingProgress = () => {
  const [completion, setCompletion] = useState(0);

  useEffect(() => {
    const updateScrollCompletion = () => {
      const currentProgress = window.scrollY;
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      if (scrollHeight) {
        setCompletion(
          Number((currentProgress / scrollHeight).toFixed(2)) * 100
        );
      }
    };

    window.addEventListener("scroll", updateScrollCompletion);
    return () => window.removeEventListener("scroll", updateScrollCompletion);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[2000]">
      <div 
        className="h-full bg-blue-500 transition-all duration-150 ease-out"
        style={{ width: `${completion}%` }}
      />
    </div>
  );
};
