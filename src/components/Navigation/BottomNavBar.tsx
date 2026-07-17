import React from 'react';
import { Camera, LayoutGrid, Clock, Users, Link } from 'lucide-react';

interface BottomNavBarProps {
  currentTab: number;
  onTabChange: (index: number) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { icon: <Clock size={24} />, label: "History" },
    { icon: <Camera size={24} />, label: "Camera" },
    { icon: <LayoutGrid size={24} />, label: "Feed" },
    { icon: <Users size={24} />, label: "Events" },
    { icon: <Link size={24} />, label: "Repos" }
  ];

  return (
    <div className="bottom-nav">
      {tabs.map((tab, idx) => (
        <button
          key={idx}
          className={`nav-item ${currentTab === idx ? 'active' : ''}`}
          onClick={() => onTabChange(idx)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
