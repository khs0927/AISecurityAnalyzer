import React from 'react';
import { Link } from 'wouter';

const WelcomePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-flutter-gradient text-white">
      <div className="w-full px-6 py-8 flex flex-col items-center justify-center">
        {/* Top Spacing */}
        <div className="h-24"></div>
        
        {/* Circle Avatar */}
        <div className="w-[100px] h-[100px] bg-white rounded-full shadow-lg"></div>
        
        {/* Spacing from Flutter example (40px) */}
        <div className="h-10"></div>
        
        {/* Welcoming Text */}
        <h1 className="text-3xl font-bold font-suite mb-2.5">안녕하세요!</h1>
        <p className="text-white/70 text-center">
          개인 건강 관리 도우미에 오신 것을 환영합니다
        </p>
        
        {/* Spacing from Flutter example (40px) */}
        <div className="h-10"></div>
        
        {/* Button Group - Using the exact colors from Flutter example */}
        <div className="flex items-center justify-center space-x-4">
          <Link href="/signup">
            <button className="rounded-full bg-white text-pink-500 font-medium py-3 px-8 shadow-lg">
              회원가입
            </button>
          </Link>
          
          <Link href="/login">
            <button className="rounded-full bg-white text-purple-700 font-medium py-3 px-8 shadow-lg">
              로그인
            </button>
          </Link>
        </div>
        
        {/* Demo Button */}
        <div className="mt-8">
          <Link href="/">
            <button className="text-white text-sm underline">
              데모 체험하기
            </button>
          </Link>
        </div>
        
        {/* Bottom spacing */}
        <div className="h-24"></div>
      </div>
    </div>
  );
};

export default WelcomePage;