import React from 'react';
import { Link } from 'wouter';
import { IconType } from 'react-icons'; // react-icons 타입 임포트
import { FaAngleRight } from 'react-icons/fa'; // 화살표 아이콘

interface LinkItemProps {
  icon: IconType;
  title: string;
  desc: string;
  href: string;
}

const LinkItem: React.FC<LinkItemProps> = ({ icon: Icon, title, desc, href }) => {
  return (
    <Link href={href} className="block bg-white rounded-lg p-4 shadow hover:translate-y-[-2px] transition-transform">
      <div className="flex items-center">
        <div className="text-2xl mr-4 w-10 text-center text-pink-500">
          <Icon />
        </div>
        <div className="flex-1">
          <div className="font-bold mb-1 text-gray-800">{title}</div>
          <div className="text-sm text-gray-600">{desc}</div>
        </div>
        <div className="text-xl text-pink-500">
          <FaAngleRight />
        </div>
      </div>
    </Link>
  );
};

export default LinkItem; 