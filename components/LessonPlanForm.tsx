import React, { useState, useCallback } from 'react';
import type { LessonPlanInput, FileWithPreview } from '../types';
import { UploadIcon, FileIcon, XIcon, RefreshCwIcon, PdfIcon } from './icons';
import { useI18n } from '../contexts/I18nContext';

interface LessonPlanFormProps {
  onSubmit: (data: LessonPlanInput, files: FileWithPreview[]) => void;
  isLoading: boolean;
  onReset: () => void;
}

const initialFormData: LessonPlanInput = {
  teacherName: '',
  lessonTitle: '',
  subject: '',
  grade: '',
  periods: 1,
  template: 'cv2345',
  integrateDigitalCompetency: false,
  integrateSTEM: false,
  integrateDigitalCitizenship: false,
  integrateDefenseSecurity: false,
  integrateAI: false,
};

const SUBJECTS_BY_LEVEL = [
  {
    levelKey: 'primary_header',
    subjects: [
      { key: 'math_primary', value: 'Toán' },
      { key: 'vietnamese_primary', value: 'Tiếng Việt' },
      { key: 'english_primary', value: 'Tiếng Anh' },
      { key: 'ethics_primary', value: 'Đạo đức' },
      { key: 'nature_society_primary', value: 'Tự nhiên và Xã hội' },
      { key: 'history_geo_primary', value: 'Lịch sử và Địa lý' },
      { key: 'science_primary', value: 'Khoa học' },
      { key: 'music_primary', value: 'Âm nhạc' },
      { key: 'art_primary', value: 'Mỹ thuật' },
      { key: 'pe_primary', value: 'Giáo dục thể chất' },
      { key: 'it_primary', value: 'Tin học' },
      { key: 'tech_primary', value: 'Công nghệ' },
      { key: 'exp_activities_primary', value: 'Hoạt động trải nghiệm' },
    ]
  },
  {
    levelKey: 'middle_header',
    subjects: [
      { key: 'literature_middle', value: 'Ngữ văn' },
      { key: 'math_middle', value: 'Toán' },
      { key: 'english_middle', value: 'Ngoại ngữ (Tiếng Anh)' },
      { key: 'civics_middle', value: 'Giáo dục công dân' },
      { key: 'history_geo_middle', value: 'Lịch sử và Địa lý' },
      { key: 'natural_science_middle', value: 'Khoa học tự nhiên' },
      { key: 'physics_middle', value: 'Vật lí' },
      { key: 'chemistry_middle', value: 'Hóa học' },
      { key: 'biology_middle', value: 'Sinh học' },
      { key: 'it_middle', value: 'Tin học' },
      { key: 'tech_middle', value: 'Công nghệ' },
      { key: 'music_art_middle', value: 'Âm nhạc và Mỹ thuật' },
      { key: 'pe_middle', value: 'Giáo dục thể chất' },
      { key: 'exp_activities_career_middle', value: 'Hoạt động trải nghiệm, hướng nghiệp' },
    ]
  },
  {
    levelKey: 'high_header',
    subjects: [
      { key: 'literature_high', value: 'Ngữ văn' },
      { key: 'math_high', value: 'Toán' },
      { key: 'english_high', value: 'Ngoại ngữ (Tiếng Anh)' },
      { key: 'history_high', value: 'Lịch sử' },
      { key: 'geography_high', value: 'Địa lý' },
      { key: 'econ_law_high', value: 'Giáo dục kinh tế và pháp luật' },
      { key: 'physics_high', value: 'Vật lí' },
      { key: 'chemistry_high', value: 'Hóa học' },
      { key: 'biology_high', value: 'Sinh học' },
      { key: 'it_high', value: 'Tin học' },
      { key: 'tech_high', value: 'Công nghệ' },
      { key: 'pe_high', value: 'Giáo dục thể chất' },
      { key: 'defense_security_high', value: 'Giáo dục Quốc phòng và an ninh' },
      { key: 'exp_activities_career_high', value: 'Hoạt động trải nghiệm, hướng nghiệp' },
    ]
  }
];

const GRADES_BY_LEVEL = [
  {
    levelKey: 'primary_header',
    grades: [
      { key: 'grade_1', value: '1' },
      { key: 'grade_2', value: '2' },
      { key: 'grade_3', value: '3' },
      { key: 'grade_4', value: '4' },
      { key: 'grade_5', value: '5' },
    ]
  },
  {
    levelKey: 'middle_header',
    grades: [
      { key: 'grade_6', value: '6' },
      { key: 'grade_7', value: '7' },
      { key: 'grade_8', value: '8' },
      { key: 'grade_9', value: '9' },
    ]
  },
  {
    levelKey: 'high_header',
    grades: [
      { key: 'grade_10', value: '10' },
      { key: 'grade_11', value: '11' },
      { key: 'grade_12', value: '12' },
    ]
  }
];


export const LessonPlanForm: React.FC<LessonPlanFormProps> = ({ onSubmit, isLoading, onReset }) => {
  const [formData, setFormData] = useState<LessonPlanInput>(initialFormData);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const { t } = useI18n();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'number' ? parseInt(value, 10) || 1 : value 
        }));
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      const newFiles = Array.from(e.target.files)
        .filter((file: File) => allowedMimes.includes(file.type) || file.name.toLowerCase().endsWith('.pdf'))
        .map((file: File) => Object.assign(file, {
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
        }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);
  
  const removeFile = useCallback((fileName: string) => {
    setFiles(prev => prev.filter(file => file.name !== fileName));
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData, files);
  };

  const handleFormReset = useCallback(() => {
    setFormData(initialFormData);
    setFiles([]);
    onReset();
  }, [onReset]);

  const hasPdfFile = files.some(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

  const inputStyles = "mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg text-gray-900";
  const labelStyles = "block text-lg font-medium";

  return (
    <div className="bg-white p-6 rounded-lg shadow-md text-blue-800">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-3xl font-semibold text-center">{t('formTitle')}</h2>
        
        <div>
          <label htmlFor="teacherName" className={labelStyles}>{t('teacherNameLabel')}</label>
          <input type="text" name="teacherName" id="teacherName" value={formData.teacherName} onChange={handleChange} required className={inputStyles}/>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="lessonTitle" className={labelStyles}>
              Tên bài dạy {hasPdfFile && <span className="text-red-500 font-bold text-sm ml-1">* (Nên nhập khi dùng PDF)</span>}
            </label>
          </div>
          <input 
            type="text" 
            name="lessonTitle" 
            id="lessonTitle" 
            value={formData.lessonTitle || ''} 
            onChange={handleChange} 
            placeholder={hasPdfFile ? "Vui lòng nhập tên bài dạy cho file PDF..." : "Tùy chọn: Nhập tên bài dạy hoặc để trống nếu dùng hình ảnh tự nhận dạng..."} 
            className={`${inputStyles} ${hasPdfFile && !formData.lessonTitle ? 'border-amber-400 ring-2 ring-amber-100 bg-amber-50/30' : ''}`}
          />
          {hasPdfFile && (
            <p className="text-xs text-amber-700 mt-1 font-medium flex items-center gap-1">
              <span>📌</span> Thầy/cô đang tải file PDF, vui lòng nhập tên bài dạy để AI tập trung soạn chính xác nội dung.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="template" className={labelStyles}>{t('templateLabel')}</label>
          <select 
            id="template" 
            name="template" 
            value={formData.template} 
            onChange={handleChange} 
            className={inputStyles}
          >
            <option value="cv2345">{t('cv2345')}</option>
            <option value="cv5512">{t('cv5512')}</option>
          </select>
        </div>
        
         <div className="relative flex items-start">
          <div className="flex items-center h-5">
            <input
              id="integrateDigitalCompetency"
              name="integrateDigitalCompetency"
              type="checkbox"
              checked={formData.integrateDigitalCompetency}
              onChange={handleChange}
              className="focus:ring-indigo-500 h-5 w-5 text-indigo-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-base">
            <label htmlFor="integrateDigitalCompetency" className="font-medium text-gray-800">
              {t('integrateDigitalCompetencyLabel')}
            </label>
          </div>
        </div>

        <div className="relative flex items-start">
          <div className="flex items-center h-5">
            <input
              id="integrateSTEM"
              name="integrateSTEM"
              type="checkbox"
              checked={formData.integrateSTEM}
              onChange={handleChange}
              className="focus:ring-indigo-500 h-5 w-5 text-indigo-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-base">
            <label htmlFor="integrateSTEM" className="font-medium text-gray-800">
              {t('integrateSTEMLabel')}
            </label>
          </div>
        </div>

        <div className="relative flex items-start">
          <div className="flex items-center h-5">
            <input
              id="integrateDigitalCitizenship"
              name="integrateDigitalCitizenship"
              type="checkbox"
              checked={formData.integrateDigitalCitizenship}
              onChange={handleChange}
              className="focus:ring-indigo-500 h-5 w-5 text-indigo-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-base">
            <label htmlFor="integrateDigitalCitizenship" className="font-medium text-gray-800">
              {t('integrateDigitalCitizenshipLabel')}
            </label>
          </div>
        </div>

        <div className="relative flex items-start">
          <div className="flex items-center h-5">
            <input
              id="integrateDefenseSecurity"
              name="integrateDefenseSecurity"
              type="checkbox"
              checked={formData.integrateDefenseSecurity}
              onChange={handleChange}
              className="focus:ring-indigo-500 h-5 w-5 text-indigo-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-base">
            <label htmlFor="integrateDefenseSecurity" className="font-medium text-gray-800">
              {t('integrateDefenseSecurityLabel')}
            </label>
          </div>
        </div>

        <div className="relative flex items-start">
          <div className="flex items-center h-5">
            <input
              id="integrateAI"
              name="integrateAI"
              type="checkbox"
              checked={formData.integrateAI}
              onChange={handleChange}
              className="focus:ring-indigo-500 h-5 w-5 text-indigo-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-base">
            <label htmlFor="integrateAI" className="font-medium text-gray-800">
              {t('integrateAILabel')}
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
              <label htmlFor="subject" className={labelStyles}>{t('subjectLabel')}</label>
              <select 
                id="subject" 
                name="subject" 
                value={formData.subject} 
                onChange={handleChange} 
                required
                className={inputStyles}
              >
                <option value="" disabled>{t('selectSubjectPlaceholder')}</option>
                {SUBJECTS_BY_LEVEL.map(level => (
                  <optgroup key={level.levelKey} label={t(level.levelKey)}>
                    {level.subjects.map(subject => (
                      <option key={subject.key} value={subject.value}>
                        {t(subject.key)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          <div>
            <label htmlFor="grade" className={labelStyles}>{t('gradeLabel')}</label>
            <select
              id="grade"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              required
              className={inputStyles}
            >
              <option value="" disabled>{t('selectGradePlaceholder')}</option>
              {GRADES_BY_LEVEL.map(level => (
                <optgroup key={level.levelKey} label={t(level.levelKey)}>
                  {level.grades.map(grade => (
                    <option key={grade.key} value={grade.value}>
                      {t(grade.key)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="periods" className={labelStyles}>{t('periodsLabel')}</label>
            <input 
                type="number" 
                name="periods" 
                id="periods" 
                value={formData.periods} 
                onChange={handleChange} 
                required 
                min="1" 
                max="10" 
                className={inputStyles}
            />
          </div>
        </div>
        
        <div>
          <label className={labelStyles}>{t('fileSupportLabel')}</label>
           <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-400 transition-colors">
            <div className="space-y-1 text-center">
              <UploadIcon />
              <div className="flex text-lg text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>{t('uploadButton')}</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,application/pdf" onChange={handleFileChange} />
                </label>
                <p className="pl-1">{t('dragAndDrop')}</p>
              </div>
              <p className="text-base text-gray-500">Hỗ trợ ảnh SGK (JPG, PNG) hoặc tệp PDF bài dạy</p>
            </div>
          </div>
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map(file => {
                const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                return (
                  <div key={file.name} className="flex items-center justify-between bg-gray-100 p-2.5 rounded-md border border-gray-200">
                     <div className="flex items-center space-x-2.5 overflow-hidden">
                      {isPdf ? <PdfIcon /> : <FileIcon />}
                      <span className="text-base text-gray-800 truncate font-medium">{file.name}</span>
                      {isPdf && (
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0">
                          PDF
                        </span>
                      )}
                    </div>
                     <button type="button" onClick={() => removeFile(file.name)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Xóa tệp">
                       <XIcon />
                     </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          <button 
            type="submit" 
            disabled={isLoading} 
            className="flex-grow flex justify-center items-center py-4 px-6 border border-transparent rounded-2xl shadow-xl text-lg font-black uppercase tracking-[0.2em] text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all active:scale-95 group"
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{t('loadingMessage')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>{t('generateButton')}</span>
                <RefreshCwIcon className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              </div>
            )}
          </button>
           <button
              type="button"
              onClick={handleFormReset}
              disabled={isLoading}
              className="flex-shrink-0 p-4 border border-gray-200 rounded-2xl shadow-sm text-gray-400 bg-white hover:bg-gray-50 hover:text-blue-600 transition-all disabled:opacity-30"
              title={t('resetFormLabel')}
            >
              <RefreshCwIcon className="w-6 h-6" />
            </button>
        </div>
      </form>
    </div>
  );
};