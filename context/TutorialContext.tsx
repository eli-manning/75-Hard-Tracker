import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { updateUserProfile } from '../lib/firestore';

export interface TutorialStep {
  route: string;
  targetId?: string;
  action?: string;
  actionDelayMs?: number;
  /** 'next'         — user presses NEXT button
   *  'route'        — user navigates to targetRoute; auto-advances
   *  'element-open' — polls openElementId until data-open="true"; auto-advances */
  advance: 'next' | 'route' | 'element-open';
  targetRoute?: string;     // advance:'route'  — pathname to watch
  openElementId?: string;   // advance:'element-open' — element that signals completion
  gatingElementId?: string; // polling waits until this element has data-open="true"
  title: string;
  body: string;
  tooltipPos: 'above' | 'below' | 'center';
  padding?: number;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    route: '/(tabs)/today',
    targetId: 'tutorial-day-header',
    advance: 'next',
    title: 'YOUR DAILY HQ',
    body: 'Your current day number, total points, and today\'s progress bar live here. Complete all 6 core tasks for a perfect-day bonus.',
    tooltipPos: 'below',
    padding: 10,
  },
  {
    route: '/(tabs)/today',
    targetId: 'tutorial-core-tasks',
    advance: 'next',
    title: 'CORE TASKS',
    body: 'Six tasks every single day: two workouts, diet, water, reading, and a progress photo. Miss one and your streak resets.',
    tooltipPos: 'below',
    padding: 8,
  },
  {
    route: '/(tabs)/today',
    targetId: 'tutorial-custom-tasks',
    action: 'collapse-core-tasks',
    actionDelayMs: 380,
    advance: 'next',
    title: 'YOUR CUSTOM TASKS',
    body: 'Stack personal habits on top of the core tasks — cold shower, meditation, journaling, anything. Earn up to 10 bonus points per day.',
    tooltipPos: 'above',
    padding: 8,
  },
  {
    route: '/(tabs)/today',
    targetId: 'tutorial-hamburger',
    advance: 'element-open',
    openElementId: 'tutorial-side-menu',
    title: 'OPEN YOUR MENU',
    body: 'Tap the ☰ icon to open your side menu. From there you can access your profile, manage tasks, and connect with friends.',
    tooltipPos: 'below',
    padding: 4,
  },
  {
    route: '/(tabs)/today',
    targetId: 'tutorial-side-menu',
    gatingElementId: 'tutorial-side-menu',
    advance: 'next',
    title: 'YOUR MENU',
    body: 'Profile and settings at the top, task manager below, friends in the middle, and terms/sign out at the bottom.',
    tooltipPos: 'center',
    padding: 0,
  },
  {
    route: '/(tabs)/today',
    targetId: 'tutorial-menu-profile',
    gatingElementId: 'tutorial-side-menu',
    advance: 'route',
    targetRoute: '/profile',
    title: 'YOUR PROFILE',
    body: 'Tap VIEW PROFILE to manage your avatar, name, notification settings, and challenge mode.',
    tooltipPos: 'center',
    padding: 12,
  },
  {
    route: '/profile',
    advance: 'next',
    title: 'PROFILE SETTINGS',
    body: 'Customize your display name, avatar, challenge start date, and daily notification time. You can also switch between 75 Hard and General mode here.',
    tooltipPos: 'center',
  },
  {
    route: '/tasks',
    targetId: 'tutorial-nav-crews',
    advance: 'route',
    targetRoute: '/(tabs)/crews',
    title: 'TASK MANAGER',
    body: 'Create Daily habits or one-off Backlog tasks — each worth 1–10 bonus points per day. Tap CREWS in the nav bar below to continue.',
    tooltipPos: 'above',
    padding: 10,
  },
  {
    route: '/(tabs)/crews',
    advance: 'next',
    title: 'CREWS',
    body: 'Build or join a Crew to tackle the challenge as a team. Shared tasks, group streaks, and daily summaries keep everyone accountable together.',
    tooltipPos: 'center',
  },
  {
    route: '/(tabs)/crews',
    targetId: 'tutorial-nav-history',
    advance: 'route',
    targetRoute: '/(tabs)/history',
    title: 'YOUR HISTORY',
    body: 'Tap HISTORY in the bottom bar to see your full challenge calendar and detailed insights.',
    tooltipPos: 'above',
    padding: 10,
  },
  {
    route: '/(tabs)/history',
    targetId: 'tutorial-calendar',
    advance: 'next',
    title: 'YOUR CALENDAR',
    body: 'Green = perfect day. Yellow = partial. Red = missed. Navigate months to review your entire challenge history at a glance.',
    tooltipPos: 'below',
    padding: 10,
  },
  {
    route: '/(tabs)/history',
    targetId: 'tutorial-nav-leaderboard',
    advance: 'route',
    targetRoute: '/(tabs)/leaderboard',
    title: 'LEADERBOARD',
    body: 'Tap LEADERBOARD in the bottom bar to see how you rank against friends and the global community.',
    tooltipPos: 'above',
    padding: 10,
  },
  {
    route: '/(tabs)/leaderboard',
    targetId: 'tutorial-leaderboard',
    advance: 'next',
    title: 'THE LEADERBOARD',
    body: 'See where you rank against friends by total points. Switch to the Global tab to compete with everyone on the app. Top 3 are highlighted in gold.',
    tooltipPos: 'below',
    padding: 8,
  },
  {
    route: '/(tabs)/today',
    advance: 'next',
    title: "YOU'RE ALL SET!",
    body: 'Start checking off your tasks and build that streak. Tap the ? in the side menu anytime to replay this tour. Good luck — you\'ve got this!',
    tooltipPos: 'center',
  },
];

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  startTutorial: (uid: string) => void;
  nextStep: () => void;
  skipTutorial: () => void;
  triggerAction: (action: string) => void;
  registerActionHandler: (action: string, handler: () => void) => () => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const uidRef = useRef<string | null>(null);
  const actionHandlers = useRef<Map<string, () => void>>(new Map());

  const registerActionHandler = useCallback((action: string, handler: () => void) => {
    actionHandlers.current.set(action, handler);
    return () => { actionHandlers.current.delete(action); };
  }, []);

  const triggerAction = useCallback((action: string) => {
    actionHandlers.current.get(action)?.();
  }, []);

  const markSeen = useCallback((uid: string) => {
    updateUserProfile(uid, { tutorialSeen: true }).catch(() => {});
  }, []);

  const currentStepRef = useRef(0);

  const startTutorial = useCallback((uid: string) => {
    uidRef.current = uid;
    currentStepRef.current = 0;
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const finish = useCallback(() => {
    setIsActive(false);
    currentStepRef.current = 0;
    setCurrentStep(0);
    if (uidRef.current) markSeen(uidRef.current);
  }, [markSeen]);

  const nextStep = useCallback(() => {
    const next = currentStepRef.current + 1;
    if (next >= TUTORIAL_STEPS.length) {
      finish();
    } else {
      currentStepRef.current = next;
      setCurrentStep(next);
    }
  }, [finish]);

  const skipTutorial = useCallback(() => {
    finish();
  }, [finish]);

  return (
    <TutorialContext.Provider value={{
      isActive, currentStep, steps: TUTORIAL_STEPS,
      startTutorial, nextStep, skipTutorial,
      triggerAction, registerActionHandler,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}
