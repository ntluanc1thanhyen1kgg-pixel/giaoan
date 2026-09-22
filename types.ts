export interface LessonPlanInput {
  teacherName: string;
  subject: string;
  grade: string;
  periods: number;
  template: 'cv2345' | 'cv5512';
  integrateDigitalCompetency: boolean;
  integrateSTEM: boolean;
  integrateDigitalCitizenship: boolean;
  integrateDefenseSecurity: boolean;
  integrateAI: boolean;
  lessonTitle?: string;
}

export interface FileWithPreview extends File {
  preview: string;
}


// --- CV 2345 Types (Original) ---
export interface ActivityStep {
  stepName: string;
  teacherAction: string;
  studentAction: string;
}

export interface ActivityTask {
  taskName: string;
  steps: ActivityStep[];
}

export interface Activity2345 {
  activityName: string;
  tasks: ActivityTask[];
}

export interface LessonPlan2345 {
  template: 'cv2345';
  subject: string;
  grade: string;
  lessonTitle: string;
  periods: number;
  executionTime: string;
  dateRange: string;
  requiredOutcomes: {
    specificCompetencies: string;
    generalCompetencies: string;
    qualities: string;
    integratedContent: string;
    digitalCompetencies: string;
  };
  teachingAids: {
    teacher: string;
    student: string;
  };
  teachingActivities: Activity2345[];
  postLessonAdjustments: string;
}


// --- CV 5512 Types (New) ---
export interface Activity5512 {
  activityName: string;
  content: string;
  product: string;
  implementation: string;
}

export interface LessonPlan5512 {
  template: 'cv5512';
  school: string;
  department: string;
  teacherName: string;
  lessonTitle: string;
  subject: string;
  grade: string;
  periods: number;
  executionTime: string;
  objectives: {
    knowledge: string;
    skills: string; // Năng lực
    qualities: string;
    digitalCompetencies: string;
  };
  teachingAidsAndMaterials: string;
  teachingProcess: Activity5512[];
}


// --- Union Type ---
export type LessonPlan = LessonPlan2345 | LessonPlan5512;