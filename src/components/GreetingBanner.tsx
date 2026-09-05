import React, { useState, useEffect } from 'react';
import { Sun, Sunset, Moon, CloudSun, Calendar, Clock, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface GreetingBannerProps {
  user: UserProfile;
  entryCount: number;
}

export const GreetingBanner: React.FC<GreetingBannerProps> = ({ user, entryCount }) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours();

  let greetingText = 'Good morning';
  let subtitleText = 'A fresh canvas for your thoughts, ideas, and intentions.';
  let IconComponent = CloudSun;
  let themeStyles = {
    bg: 'bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    iconColor: 'text-amber-600',
  };

  if (hours >= 5 && hours < 12) {
    greetingText = 'Good morning';
    subtitleText = 'Capture your early sparks of clarity and set your focus for today.';
    IconComponent = Sun;
    themeStyles = {
      bg: 'bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent',
      badge: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
      iconColor: 'text-amber-300',
    };
  } else if (hours >= 12 && hours < 17) {
    greetingText = 'Good afternoon';
    subtitleText = 'Take a mindful pause in your day to voice what’s on your mind.';
    IconComponent = Sun;
    themeStyles = {
      bg: 'bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-transparent',
      badge: 'bg-sky-500/20 text-sky-200 border-sky-500/30',
      iconColor: 'text-sky-300',
    };
  } else if (hours >= 17 && hours < 22) {
    greetingText = 'Good evening';
    subtitleText = 'Unpack your day’s victories, lessons, and feelings in peace.';
    IconComponent = Sunset;
    themeStyles = {
      bg: 'bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-transparent',
      badge: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
      iconColor: 'text-indigo-300',
    };
  } else {
    greetingText = 'Good night';
    subtitleText = 'Let go of the noise. Reflect, rest, and restore your clarity.';
    IconComponent = Moon;
    themeStyles = {
      bg: 'bg-gradient-to-r from-slate-900/40 via-violet-950/20 to-transparent',
      badge: 'bg-slate-800/60 text-slate-200 border-white/15',
      iconColor: 'text-violet-300',
    };
  }

  const formattedDate = currentTime.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const firstName = user.displayName ? user.displayName.split(' ')[0] : 'there';

  return (
    <div
      id="greeting-banner"
      className={`rounded-3xl p-6 sm:p-8 backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl relative overflow-hidden mb-8 ${themeStyles.bg}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border backdrop-blur-md ${themeStyles.badge}`}
            >
              <IconComponent className={`w-3.5 h-3.5 ${themeStyles.iconColor}`} />
              {greetingText}
            </span>
            <span className="text-xs text-slate-400 font-medium">Local System Time</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-slate-100 tracking-tight">
            {greetingText}, <span className="font-semibold text-white">{firstName}</span>.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl font-normal leading-relaxed">
            {subtitleText}
          </p>
        </div>

        {/* Live Date & Stats Badge */}
        <div className="flex flex-wrap md:flex-col items-start md:items-end gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300 backdrop-blur-md bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300 backdrop-blur-md bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono tabular-nums">{formattedTime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-200 backdrop-blur-md bg-indigo-500/20 px-3 py-1 rounded-xl border border-indigo-400/30 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>{entryCount} saved journal {entryCount === 1 ? 'entry' : 'entries'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
