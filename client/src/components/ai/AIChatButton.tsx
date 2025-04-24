import { Link } from 'wouter';
import { Bot, Brain } from 'lucide-react';
import AIChatDialog from './AIChatDialog';

const AIChatButton = () => {
  return (
    <div className="fixed right-6 bottom-20 z-10">
      <AIChatDialog
        trigger={
          <button className="w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center">
            <div className="relative">
              <Bot className="w-7 h-7 text-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border border-white animate-pulse"></span>
            </div>
          </button>
        }
      />
    </div>
  );
};

export default AIChatButton;
