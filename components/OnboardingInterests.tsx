import React, { useState } from 'react';
import { ChevronLeft, BrainCircuit, Bot, Palette, Code2, BarChart2, Zap, FlaskConical, BookOpen } from 'lucide-react';

interface Props {
  onComplete: (interests: string[], goals: string[]) => Promise<void>;
}

const INTERESTS = [
  { key: 'ai_ml',        label: 'AI & Machine Learning', Icon: BrainCircuit },
  { key: 'robotics',     label: 'Robotica',               Icon: Bot          },
  { key: 'design_ux',    label: 'Design & UX',            Icon: Palette      },
  { key: 'coding',       label: 'Coding & Development',   Icon: Code2        },
  { key: 'data_science', label: 'Data Science',           Icon: BarChart2    },
];

const GOALS = [
  { key: 'hackathon', label: 'Partecipare ad Hackathon', Icon: Zap         },
  { key: 'labs',      label: 'Frequentare Laboratori',   Icon: FlaskConical },
  { key: 'content',   label: 'Accedere a Contenuti',     Icon: BookOpen    },
];

export const OnboardingInterests: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleItem = (key: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    await onComplete(selectedInterests, selectedGoals);
    setIsLoading(false);
  };

  const currentItems = step === 1 ? INTERESTS : GOALS;
  const currentSelected = step === 1 ? selectedInterests : selectedGoals;
  const currentSetter = step === 1 ? setSelectedInterests : setSelectedGoals;
  const canProceed = currentSelected.length > 0;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-10 animate-in fade-in duration-700">
      <div className="text-center mb-8">
        <img src="/logo.png" alt="JumpIn" className="h-20 w-auto mx-auto mb-1" />
        <p className="text-[10px] text-orange-400 font-bold tracking-widest uppercase">Dashboard</p>
      </div>

      <div className="liquid-glass p-6 rounded-[2rem] w-full">
        {/* Step indicator + progress bar */}
        <div className="mb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Passo {step} di 2
          </p>
          <div className="w-full h-1 bg-orange-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        <h2 className="text-xl font-bold font-montserrat text-gray-800 mb-1">
          {step === 1 ? 'Cosa ti appassiona?' : "Cosa cerchi su Jump'in?"}
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          {step === 1 ? 'Seleziona almeno un interesse' : 'Seleziona almeno un obiettivo'}
        </p>

        {/* Selection tiles */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {currentItems.map(({ key, label, Icon }, index) => {
            const isSelected = currentSelected.includes(key);
            const isLastOdd = index === currentItems.length - 1 && currentItems.length % 2 !== 0;
            return (
              <button
                key={key}
                onClick={() => toggleItem(key, currentSetter)}
                className={`p-3.5 rounded-2xl text-left transition-all duration-200 border-2 ${
                  isLastOdd ? 'col-span-2' : ''
                } ${
                  isSelected
                    ? 'bg-orange-50 border-orange-400'
                    : 'bg-white/60 border-gray-200 hover:border-orange-200'
                }`}
              >
                <Icon
                  size={22}
                  className={`mb-2 ${isSelected ? 'text-orange-500' : 'text-gray-400'}`}
                />
                <span className={`text-xs font-semibold leading-tight block ${
                  isSelected ? 'text-orange-700' : 'text-gray-700'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => step === 2 && setStep(1)}
            disabled={step === 1}
            className={`flex items-center gap-1 text-sm font-bold transition-all ${
              step === 1 ? 'text-gray-200 cursor-default' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChevronLeft size={16} />
            Indietro
          </button>

          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!canProceed}
              className="px-6 py-2.5 rounded-2xl btn-primary-liquid text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              Continua
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed || isLoading}
              className="px-6 py-2.5 rounded-2xl btn-primary-liquid text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {isLoading ? 'Salvataggio...' : 'Vai alla Home'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
