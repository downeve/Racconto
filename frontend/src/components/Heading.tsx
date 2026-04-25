// src/components/Heading.tsx
import React from 'react';

interface HeadingProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6; // h1 ~ h6 지원
  children: React.ReactNode;
  className?: string; // 여백(margin) 등 추가 스타일용
}

export default function Heading({ level = 2, children, className = '' }: HeadingProps) {
  // 🎯 프로젝트 전체에 공통으로 적용될 타이틀 느낌 (진한 회색, 굵게, 좁은 자간)
  const baseStyle = "";
  //기존 base-style 삭제 "text-stone-900 font-bold tracking-tight font-serif";
  
  // 📏 레벨에 따른 글자 크기 설정
  const sizeStyle = {
    1: "text-3xl sm:text-4xl", 
    2: "text-2xl",
    3: "text-lg",
    4: "text-base",
    5: "text-sm",
    6: "text-xs",
  };

  const combinedClassName = `${baseStyle} ${sizeStyle[level]} ${className}`.trim();

  // 💡 [수정된 부분] TypeScript가 완벽하게 이해할 수 있도록 React.ElementType으로 타입 지정
  const Tag = `h${level}` as React.ElementType;

  return <Tag className={combinedClassName}>{children}</Tag>;
}