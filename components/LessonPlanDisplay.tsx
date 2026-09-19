
import React from 'react';
import type { LessonPlan, LessonPlan2345, LessonPlan5512, Activity2345, Activity5512 } from '../types';
import { DownloadIcon, RobotIcon } from './icons';
import { useI18n } from '../contexts/I18nContext';

interface LessonPlanDisplayProps {
  lessonPlan: LessonPlan[] | null;
  isLoading: boolean;
  error: string | null;
  onDownload: (plans: LessonPlan[], label?: string) => void;
}

const ActivityTable2345: React.FC<{ activities: Activity2345[], t: (key: string) => string }> = ({ activities, t }) => {
  return (
    <table className="min-w-full border-collapse border border-gray-400">
      <thead className="bg-[#fce5cd]">
        <tr>
          <th className="font-bold border border-gray-400 p-2 text-center w-1/2">{t('teacherActivityHeader')}</th>
          <th className="font-bold border border-gray-400 p-2 text-center w-1/2">{t('studentActivityHeader')}</th>
        </tr>
      </thead>
      <tbody>
        {activities.map((activity, aIndex) => (
          <React.Fragment key={aIndex}>
            <tr className="bg-white">
              <td colSpan={2} className="border border-gray-400 p-2">
                <p className="font-bold text-green-600 text-lg">{activity.activityName}</p>
              </td>
            </tr>
            {activity.tasks.map((task, tIndex) => (
              <React.Fragment key={tIndex}>
                {task.taskName && (
                  <tr className="bg-gray-50">
                    <td colSpan={2} className="border border-gray-400 p-2 italic font-semibold text-gray-700">
                      {task.taskName}
                    </td>
                  </tr>
                )}
                {task.steps.map((step, sIndex) => (
                  <tr 
                    key={sIndex} 
                    className={`border-x border-gray-400 ${sIndex < task.steps.length - 1 ? "border-b border-dashed border-gray-400" : "border-b border-gray-400"}`}
                  >
                    <td className="p-2 align-top whitespace-pre-wrap border-r border-gray-400">
                      {step.teacherAction}
                    </td>
                    <td className="p-2 align-top whitespace-pre-wrap">
                      {step.studentAction}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

const LessonPlanItem2345: React.FC<{ plan: LessonPlan2345, index: number, t: (key: string) => string }> = ({ plan, index, t }) => (
  <div className="prose prose-sm max-w-none font-times text-[13pt] leading-relaxed text-justify mb-12 last:mb-0 border-b-2 border-gray-200 pb-8 last:border-b-0 last:pb-0">
    <h1 className="text-center font-bold uppercase mb-1">{t('lessonPlanTitle')}</h1>
    <p className="text-center font-bold mb-1">Môn học: {plan.subject}</p>
    <p className="text-center mb-1"><b>{plan.lessonTitle} ({plan.periods} tiết)</b>; <b>Tiết: {plan.executionTime}</b></p>
    <p className="text-center mb-4 italic">
      Thời gian thực hiện: {plan.dateRange}
    </p>
    
    <h2 className="font-bold">I. YÊU CẦU CẦN ĐẠT</h2>
    <p className="text-blue-600 font-bold">1. Năng lực đặc thù: <span className="font-normal text-black">{plan.requiredOutcomes.specificCompetencies}</span></p>
    <p className="text-blue-600 font-bold">2. Năng lực chung: <span className="font-normal text-black">{plan.requiredOutcomes.generalCompetencies}</span></p>
    <p className="text-blue-600 font-bold">3. Phẩm chất: <span className="font-normal text-black">{plan.requiredOutcomes.qualities}</span></p>
    {plan.requiredOutcomes.integratedContent && plan.requiredOutcomes.integratedContent !== 'Không áp dụng.' && (
       <p><b>{t('integratedContent')}</b> {plan.requiredOutcomes.integratedContent}</p>
    )}

    <h2 className="font-bold uppercase">II. ĐỒ DÙNG DẠY HỌC:</h2>
    <p><b>{t('teacherAids')}</b> {plan.teachingAids.teacher}</p>
    <p><b>{t('studentAids')}</b> {plan.teachingAids.student}</p>

    <h2 className="font-bold uppercase">III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU</h2>
    <ActivityTable2345 activities={plan.teachingActivities} t={t} />
    
    <h2 className="font-bold uppercase mt-6">IV. ĐIỀU CHỈNH SAU BÀI DẠY (nếu có)</h2>
    <div className="space-y-6 mt-4">
      <div className="border-b-2 border-dotted border-gray-600"></div>
      <div className="border-b-2 border-dotted border-gray-600"></div>
    </div>
  </div>
);


const ActivityDisplay5512: React.FC<{ activity: Activity5512, t: (key: string) => string }> = ({ activity, t }) => {
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden mb-6 not-prose">
      <h3 className="bg-gray-100 px-4 py-3 font-bold text-gray-800 text-[13pt] font-times">{activity.activityName}</h3>
      <div className="p-4 space-y-3 font-times text-[13pt] text-justify">
        <p className="whitespace-pre-wrap"><b>{t('content')}</b> {activity.content}</p>
        <p className="whitespace-pre-wrap"><b>{t('product')}</b> {activity.product}</p>
        <p className="whitespace-pre-wrap"><b>{t('implementation')}</b> {activity.implementation}</p>
      </div>
    </div>
  );
};


const LessonPlanItem5512: React.FC<{ plan: LessonPlan5512, index: number, t: (key: string) => string }> = ({ plan, index, t }) => (
  <div className="prose prose-sm max-w-none font-times text-[13pt] leading-relaxed text-justify mb-12 last:mb-0 border-b-2 border-gray-200 pb-8 last:border-b-0 last:pb-0">
    <h1 className="text-center font-bold uppercase mb-2">{t('lessonPlanTitle')}</h1>
    <div className="flex justify-between items-start not-prose my-4">
        <div>
          <p className="font-times text-[13pt]"><b>{t('school')}:</b> {plan.school}</p>
          <p className="font-times text-[13pt]"><b>{t('department')}:</b> {plan.department}</p>
        </div>
        <div>
          <p className="font-times text-[13pt]"><b>{t('teacherName')}:</b> {plan.teacherName}</p>
        </div>
    </div>
    <hr className="my-4 border-gray-300"/>
    <p className="text-center text-xl font-bold mb-4">{plan.lessonTitle}</p>
    <p className="text-center"><b>{t('subject')}:</b> {plan.subject}; <b>{t('grade')}:</b> {plan.grade}</p>
    <p className="text-center">
      <b>{t('executionTime')}:</b> {plan.periods} {t('period').toLowerCase()}; <b>Tiết: {plan.executionTime}</b>
      <span className="italic ml-2">({t('docxDate')})</span>
    </p>
    
    <h2 className="font-bold">{t('objectives')}</h2>
    <p className="indent-8"><b>{t('knowledge')}:</b> {plan.objectives.knowledge}</p>
    <p className="indent-8"><b>{t('skills')}:</b> {plan.objectives.skills}</p>
    <p className="indent-8"><b>{t('qualities')}:</b> {plan.objectives.qualities}</p>

    <h2 className="font-bold">{t('teachingAidsAndMaterials')}</h2>
    {plan.teachingAidsAndMaterials.split('\n').filter(line => line.trim() !== '').map((line, i) => (
      <p key={`aid-${i}`} className="indent-8">{line}</p>
    ))}

    <h2 className="font-bold">{t('teachingProcess')}</h2>
    <div>
        {plan.teachingProcess.map((activity, actIndex) => (
            <ActivityDisplay5512 key={actIndex} activity={activity} t={t} />
        ))}
    </div>
  </div>
);

const ErrorMessageWithLink: React.FC<{ message: string }> = ({ message }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = message.split(urlRegex);

  return (
    <div className="text-base text-center whitespace-pre-line">
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a href={part} key={index} className="text-blue-500 underline hover:text-blue-700" target="_blank" rel="noopener noreferrer">
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};


export const LessonPlanDisplay: React.FC<LessonPlanDisplayProps> = ({ lessonPlan, isLoading, error, onDownload }) => {
  const { t } = useI18n();
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <svg className="animate-spin h-12 w-12 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-semibold">{t('loadingMessage')}</p>
          <p className="text-gray-500">{t('loadingSubMessage')}</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-red-600">
           <p className="text-lg font-semibold mb-2">{t('errorMessage')}</p>
           <ErrorMessageWithLink message={error} />
        </div>
      );
    }
    if (!lessonPlan || lessonPlan.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
          <RobotIcon />
          <h3 className="mt-2 text-lg font-medium text-gray-900">{t('emptyStateTitle')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('emptyStateSubtitle')}</p>
        </div>
      );
    }

    const template = lessonPlan[0].template;

    return (
      <div className="relative">
        {/* Quick Access Download Bar - Sticky at Top */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm pt-2 pb-4 z-20 border-b mb-8 shadow-sm -mx-6 px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{t('previewTitle')}</h2>
            {lessonPlan.length > 1 && (
              <button 
                onClick={() => onDownload(lessonPlan)} 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-105 active:scale-95"
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                <span>{t('downloadAllButton')}</span>
              </button>
            )}
          </div>

          {/* Quick Period Buttons */}
          <div className="flex flex-wrap gap-2">
            {lessonPlan.map((plan, index) => (
              <button 
                key={`btn-dl-${index}`}
                onClick={() => onDownload([plan], String(index + 1))}
                className="inline-flex items-center px-4 py-2 border border-green-600 text-sm font-bold rounded-md text-green-700 bg-white hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all shadow-sm"
                title={`${t('downloadPeriodButton')} ${index + 1}`}
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                {t('period')} {index + 1}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content Section */}
        <div className="space-y-12">
          {lessonPlan.map((plan, index) => {
            if (template === 'cv5512') {
              return <LessonPlanItem5512 key={index} plan={plan as LessonPlan5512} index={index} t={t} />;
            } else {
              return <LessonPlanItem2345 key={index} plan={plan as LessonPlan2345} index={index} t={t} />;
            }
          })}
        </div>
      </div>
    );
  };

  return <div className="h-full">{renderContent()}</div>;
};
