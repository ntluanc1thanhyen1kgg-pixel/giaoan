import express from "express";
import path from "path";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log("Starting server...");
  console.log("Current working directory:", process.cwd());
  console.log("NODE_ENV:", process.env.NODE_ENV);

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // --- SCHEMAS ---
  const lessonPlan2345ObjectSchema = {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING, description: "Môn học" },
      grade: { type: Type.STRING, description: "Lớp học" },
      lessonTitle: { type: Type.STRING, description: "Tên bài học. Ví dụ: 'Bài 1: Làm quen với máy tính'" },
      periods: { type: Type.INTEGER, description: "Tổng số tiết của toàn bộ bài học này. Bắt buộc chỉ trả về MỘT SỐ NGUYÊN DUY NHẤT." },
      executionTime: { type: Type.STRING, description: "Thứ tự của tiết học này trong bài dạy. Ví dụ: Nếu đây là tiết đầu tiên thì ghi '1', tiết thứ hai ghi '2'." },
      dateRange: { type: Type.STRING, description: "Thời gian thực hiện. Định dạng '.../.../.... đến .../.../....'. AI tự điền giá trị mẫu." },
      requiredOutcomes: {
        type: Type.OBJECT,
        properties: {
          specificCompetencies: { type: Type.STRING, description: "1. Năng lực đặc thù: Các năng lực chuyên môn cần đạt." },
          generalCompetencies: { type: Type.STRING, description: "2. Năng lực chung: Các năng lực tự chủ, giao tiếp, giải quyết vấn đề." },
          qualities: { type: Type.STRING, description: "3. Phẩm chất: Các phẩm chất yêu nước, nhân ái, chăm chỉ, v.v." },
          integratedContent: { type: Type.STRING, description: "Nội dung tích hợp liên môn (nơi lưu trữ định hướng NLS nếu có)." },
          digitalCompetencies: { type: Type.STRING, description: "Luôn trả về 'Không áp dụng.'." }
        },
        required: ['specificCompetencies', 'generalCompetencies', 'qualities', 'integratedContent', 'digitalCompetencies']
      },
      teachingAids: {
        type: Type.OBJECT,
        properties: {
          teacher: { type: Type.STRING, description: "Đồ dùng, thiết bị của giáo viên." },
          student: { type: Type.STRING, description: "Đồ dùng, sách vở của học sinh." },
        },
        required: ['teacher', 'student']
      },
      teachingActivities: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            activityName: { type: Type.STRING, description: "Tên hoạt động. Bắt buộc phải là một trong các giá trị sau: '1. Khởi động ( phút)', '2. Hình thành kiến thức mới ( phút)', '3. Luyện tập, thực hành ( phút)', '4. Vận dụng, trải nghiệm ( phút)'. AI tự điền số phút hợp lý." },
            tasks: {
              type: Type.ARRAY,
              description: "Trong mỗi hoạt động tùy theo bài có thể chia làm nhiều nhiệm vụ. Mỗi nhiệm vụ PHẢI được làm rõ qua 4 thao tác.",
              items: {
                type: Type.OBJECT,
                properties: {
                  taskName: { type: Type.STRING, description: "Tên nhiệm vụ cụ thể. Ví dụ: 'Nhiệm vụ 1: Tìm hiểu về...', 'Nhiệm vụ 2: Thực hành...'." },
                  steps: {
                    type: Type.ARRAY,
                    description: "Mỗi nhiệm vụ PHẢI được làm rõ qua 4 thao tác.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stepName: { type: Type.STRING, description: "Tên thao tác. Phải lần lượt là: 'Chuyển giao nhiệm vụ học tập', 'Tổ chức cho học sinh thực hiện nhiệm vụ học tập', 'Tổ chức cho học sinh trình bày kết quả và thảo luận', 'Nhận xét, đánh giá thực hiện nhiệm vụ học tập'." },
                        teacherAction: { type: Type.STRING, description: "Chi tiết hành động của giáo viên." },
                        studentAction: { type: Type.STRING, description: "Chi tiết hành động của học sinh tương ứng." },
                      },
                      required: ['stepName', 'teacherAction', 'studentAction']
                    }
                  }
                },
                required: ['taskName', 'steps']
              }
            }
          },
          required: ['activityName', 'tasks']
        },
      },
      postLessonAdjustments: { type: Type.STRING, description: "Nội dung điều chỉnh sau bài dạy. Trả về chuỗi rỗng ''." },
    },
    required: ['subject', 'grade', 'lessonTitle', 'periods', 'executionTime', 'dateRange', 'requiredOutcomes', 'teachingAids', 'teachingActivities', 'postLessonAdjustments']
  };

  const lessonPlan2345Schema = {
      type: Type.ARRAY,
      items: lessonPlan2345ObjectSchema,
  };

  const lessonPlan5512ObjectSchema = {
      type: Type.OBJECT,
      properties: {
          school: { type: Type.STRING, description: "Tên trường học. Nếu không có thông tin, điền '......................................................'" },
          department: { type: Type.STRING, description: "Tên tổ chuyên môn. Nếu không có thông tin, điền '.........................................'" },
          teacherName: { type: Type.STRING, description: "Họ và tên giáo viên, lấy từ thông tin đầu vào." },
          lessonTitle: { type: Type.STRING, description: "Tên bài dạy. AI tự động xác định tên bài học phù hợp nhất. Ví dụ: 'Bài 6: Chăm sóc hoa, cây cảnh trong chậu'" },
          subject: { type: Type.STRING, description: "Môn học/Hoạt động giáo dục, lấy từ thông tin đầu vào." },
          grade: { type: Type.STRING, description: "Lớp, lấy từ thông tin đầu vào." },
          periods: { type: Type.INTEGER, description: "Tổng số tiết của toàn bộ bài học này. Bắt buộc chỉ trả về MỘT SỐ NGUYÊN DUY NHẤT. Ví dụ: nếu bài học có 3 tiết, chỉ trả về số 3." },
          executionTime: { type: Type.STRING, description: "Thứ tự của tiết học này trong bài dạy. Ví dụ: Nếu đây là tiết đầu tiên thì ghi '1', tiết thứ hai ghi '2'." },
          objectives: {
              type: Type.OBJECT,
              properties: {
                  knowledge: { type: Type.STRING, description: "Kiến thức học sinh cần chiếm lĩnh." },
                  skills: { type: Type.STRING, description: "Các biểu hiện năng lực chung và đặc thù mà học sinh thể hiện." },
                  qualities: { type: Type.STRING, description: "Các hành vi, thái độ tích cực học sinh cần hình thành." },
                  digitalCompetencies: { type: Type.STRING, description: "Luôn trả về 'Không áp dụng.'." }
              },
              required: ['knowledge', 'skills', 'qualities', 'digitalCompetencies']
          },
          teachingAidsAndMaterials: { type: Type.STRING, description: "Liệt kê đầy đủ thiết bị, học liệu được sử dụng." },
          teachingProcess: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: {
                      activityName: { type: Type.STRING, description: "Tên hoạt động. Phải là một trong các giá trị: '1. Hoạt động 1: Mở đầu ...', '2. Hoạt động 2: Hình thành kiến thức mới ...', '3. Hoạt động 3: Luyện tập', '4. Hoạt động 4: Vận dụng'" },
                      content: { type: Type.STRING, description: "Nội dung, yêu cầu hoặc nhiệm vụ cụ thể học sinh phải thực hiện." },
                      product: { type: Type.STRING, description: "Sản phẩm, kết quả học sinh phải hoàn thành." },
                      implementation: { type: Type.STRING, description: "Các bước tổ chức thực hiện hoạt động (Giao nhiệm vụ, Thực hiện, Báo cáo, Kết luận), sử dụng xuống dòng để phân tách." },
                  },
                  required: ['activityName', 'content', 'product', 'implementation']
              },
          },
      },
      required: ['school', 'department', 'teacherName', 'lessonTitle', 'subject', 'grade', 'periods', 'executionTime', 'objectives', 'teachingAidsAndMaterials', 'teachingProcess']
  };

  const lessonPlan5512Schema = {
      type: Type.ARRAY,
      items: lessonPlan5512ObjectSchema,
  };

  // --- PROMPT GENERATORS ---
  const getDigitalCompetencyPrompt = (integrate: boolean, locale: 'vi' | 'en'): string => {
      if (locale === 'en') {
          if (integrate) {
              return `
8.  **DIGITAL COMPETENCY ORIENTATION (NLS - MANDATORY):**
    - **Selection:** Analyze all activities to find the most relevant one(s) for digital competency integration.
    - **Integration:** Integrate directly into \`studentActivity\` using the format \`(NLS [Code] - [Description])\`.
    - **Requirement:** Clearly state the specific digital task or tool the student must use.
    - **Summary:** List integrated codes in 'integratedContent' (CV 2345) or 'objectives.skills' (CV 5512).
`;
          }
          return `8. **DIGITAL COMPETENCY (NLS):** Not requested.`;
      }

      if (integrate) {
          return `
8.  **ĐỊNH HƯỚNG NĂNG LỰC SỐ (NLS - BẮT BUỘC):**
    - **Lựa chọn:** Phân tích kỹ nội dung bài dạy để tìm ra hoạt động phù hợp nhất để lồng ghép năng lực số.
    - **Tích hợp:** Ghi trực tiếp vào cột 'Hoạt động của học sinh' theo định dạng \`(NLS [Mã] - [Nội dung chỉ báo])\`.
    - **Yêu cầu:** Phải nêu rõ nhiệm vụ cụ thể của học sinh liên quan đến việc sử dụng công cụ số hoặc giải quyết vấn đề số.
    - **Thông báo:** Ghi rõ mã NLS vào phần 'Nội dung tích hợp' (CV 2345) hoặc cuối phần 'Năng lực' (CV 5512).
`;
      }
      return `8. **ĐỊNH HƯỚNG NĂNG LỰC SỐ (NLS):** Không yêu cầu tích hợp.`;
  };

  const getSTEMIntegrationPrompt = (integrate: boolean, locale: 'vi' | 'en'): string => {
      if (!integrate) return '';
      
      if (locale === 'en') {
          return `
9.  **STEM INTEGRATION (OFFICIAL LETTER 909/BGDDT):**
    - **Task:** Analyze the lesson content to select the specific activity/period for STEM integration.
    - **Detailed Integration:** Clearly define the STEM task. The integration MUST be visible in BOTH \`teacherActivity\` (guidance, facilitation) and \`studentActivity\` (designing, creating, testing).
    - **Requirement:** State the specific "STEM Task" and its requirements within the selected activity.
    - **Notification:** Mention in 'integratedContent' (CV 2345) or 'objectives.skills' (CV 5512).
`;
      }

      return `
9.  **TÍCH HỢP STEM (CÔNG VĂN 909/BGDĐT):**
    - **Nhiệm vụ:** Phân tích nội dung bài dạy để chọn ra hoạt động hoặc tiết học phù hợp nhất để tích hợp STEM.
    - **Tích hợp chi tiết:** Phải thể hiện rõ ràng "Nhiệm vụ STEM" trong CẢ 'Hoạt động của giáo viên' (hướng dẫn kỹ thuật, gợi mở thiết kế) và 'Hoạt động của học sinh' (thực hiện thiết kế, chế tạo sản phẩm, thử nghiệm).
    - **Yêu cầu:** Nêu rõ yêu cầu cụ thể của sản phẩm STEM hoặc giải pháp kỹ thuật mà học sinh cần đạt được trong hoạt động đó.
    - **Thông báo:** Ghi rõ nội dung tích hợp vào phần 'Nội dung tích hợp' (CV 2345) hoặc cuối phần 'Năng lực' (CV 5512).
`;
  };

  const getDigitalCitizenshipPrompt = (integrate: boolean, locale: 'vi' | 'en'): string => {
      if (!integrate) return '';

      if (locale === 'en') {
          return `
10. **DIGITAL CITIZENSHIP INTEGRATION (OFFICIAL LETTER 3899/BGDDT-GDTH):**
    - **Task:** Select the most appropriate lesson parts to discuss digital ethics, safety, or communication.
    - **Explicit Actions:** Detail the teacher's guidance on digital behavior and the students' response/discussion in the respective activity fields.
    - **Requirement:** Define the "Digital Citizenship Rule" or "Behavior" being practiced.
    - **Notification:** Mention in 'integratedContent' (CV 2345) or 'objectives.skills' (CV 5512).
`;
      }

      return `
10. **TÍCH HỢP CÔNG DÂN SỐ (CÔNG VĂN 3899/BGDĐT-GDTH):**
    - **Nhiệm vụ:** Chọn các phần bài học phù hợp nhất để lồng ghép thảo luận về đạo đức số, an toàn số hoặc giao tiếp số.
    - **Hành động rõ ràng:** Chi tiết hóa hướng dẫn của giáo viên về hành vi số và phản hồi/thảo luận của học sinh trong các trường hoạt động tương ứng.
    - **Yêu cầu:** Nêu rõ "Quy tắc công dân số" hoặc "Hành vi số" cụ thể mà học sinh đang thực hành hoặc thảo luận.
    - **Thông báo:** Ghi rõ nội dung tích hợp vào phần 'Nội dung tích hợp' (CV 2345) hoặc cuối phần 'Năng lực' (CV 5512).
`;
  };

  const getPrompt2345 = (data: any, locale: 'vi' | 'en') => {
      const digitalCompetencyInstruction = getDigitalCompetencyPrompt(data.integrateDigitalCompetency, locale);
      const stemInstruction = getSTEMIntegrationPrompt(data.integrateSTEM, locale);
      const digitalCitizenshipInstruction = getDigitalCitizenshipPrompt(data.integrateDigitalCitizenship, locale);
      if (locale === 'en') {
          return `You are an expert in creating lesson plans. Create a detailed set of Lesson Plans following 'Official Letter 2345' format.
          Subject: ${data.subject}, Grade: ${data.grade}, Teacher: ${data.teacherName}, Periods: ${data.periods}.
          Output exactly ${data.periods} lesson plan objects.
          ${digitalCompetencyInstruction}
          ${stemInstruction}
          ${digitalCitizenshipInstruction}`;
      }
      return `Bạn là chuyên gia soạn giáo án Việt Nam. Tạo giáo án chi tiết theo mẫu mới:
      Môn: ${data.subject}, Lớp: ${data.grade}, GV: ${data.teacherName}, Số tiết: ${data.periods}.
      Tạo chính xác ${data.periods} đối tượng giáo án, mỗi đối tượng tương ứng với một tiết học riêng biệt.
      YÊU CẦU QUAN TRỌNG VỀ PHÂN CHIA TIẾT:
      - Nếu bài học có nhiều tiết (ví dụ 2 tiết), bạn phải chia nội dung thành 2 đối tượng JSON.
      - Đối tượng 1: Ghi 'executionTime' là '1'. Đây là Tiết 1.
      - Đối tượng 2: Ghi 'executionTime' là '2'. Đây là Tiết 2.
      - Phân bổ nội dung logic: Ví dụ Tiết 1 dạy phần Khám phá, Tiết 2 dạy phần Luyện tập & Vận dụng.
      1. Phân bổ nội dung: Nội dung dạy học phải được phân bổ logic giữa các tiết. Ví dụ: Tiết 1 có thể tập trung vào Khởi động và Hình thành kiến thức mới (một phần); Tiết 2 tiếp tục Hình thành kiến thức, Luyện tập và Vận dụng. Đảm bảo Tiết 2 tiếp nối Tiết 1 một cách tự nhiên.
      2. KHÔNG ĐƯỢC TẠO trường 'objective' (mục tiêu) cho từng hoạt động dạy học.
      3. MỖI hoạt động dạy học (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng) có thể chia làm một hoặc nhiều nhiệm vụ (tasks) tùy theo nội dung bài học để thêm sinh động.
      4. MỖI nhiệm vụ trong hoạt động PHẢI được làm rõ qua 4 thao tác sau (không cần ghi tên thao tác vào nội dung, chỉ cần điền đúng vào schema):
          - Chuyển giao nhiệm vụ học tập
          - Tổ chức cho học sinh thực hiện nhiệm vụ học tập
          - Tổ chức cho học sinh trình bày kết quả và thảo luận
          - Nhận xét, đánh giá thực hiện nhiệm vụ học tập.
      Mỗi thao tác phải có nội dung tương ứng cho cả Giáo viên (teacherAction) và Học sinh (studentAction).
      ${digitalCompetencyInstruction}
      ${stemInstruction}
      ${digitalCitizenshipInstruction}`;
  };

  const getPrompt5512 = (data: any, locale: 'vi' | 'en') => {
      const digitalCompetencyInstruction = getDigitalCompetencyPrompt(data.integrateDigitalCompetency, locale);
      const stemInstruction = getSTEMIntegrationPrompt(data.integrateSTEM, locale);
      const digitalCitizenshipInstruction = getDigitalCitizenshipPrompt(data.integrateDigitalCitizenship, locale);
      if (locale === 'en') {
          return `You are an expert in creating lesson plans. Create a detailed set of Lesson Plans following 'Official Letter 5512' format.
          Subject: ${data.subject}, Grade: ${data.grade}, Teacher: ${data.teacherName}, Periods: ${data.periods}.
          Output exactly ${data.periods} lesson plan objects.
          ${digitalCompetencyInstruction}
          ${stemInstruction}
          ${digitalCitizenshipInstruction}`;
      }
      return `Bạn là chuyên gia soạn giáo án Việt Nam. Tạo giáo án chi tiết theo chuẩn Công văn 5512.
      Môn: ${data.subject}, Lớp: ${data.grade}, GV: ${data.teacherName}, Số tiết: ${data.periods}.
      Tạo chính xác ${data.periods} đối tượng giáo án, mỗi đối tượng tương ứng với một tiết học riêng biệt (Tiết 1, Tiết 2, ...).
      YÊU CẦU QUAN TRỌNG VỀ PHÂN CHIA TIẾT:
      - Nếu bài học có nhiều tiết (ví dụ 2 tiết), bạn phải chia nội dung thành 2 đối tượng JSON.
      - Đối tượng 1: Ghi 'executionTime' là '1'. Đây là Tiết 1.
      - Đối tượng 2: Ghi 'executionTime' là '2'. Đây là Tiết 2.
      - Phân bổ nội dung logic giữa các tiết để đảm bảo tính liên tục.
      ${digitalCompetencyInstruction}
      ${stemInstruction}
      ${digitalCitizenshipInstruction}`;
  };

  // API Routes
  app.get("/api/config", (req, res) => {
    res.json({ hasApiKey: !!process.env.GEMINI_API_KEY });
  });

  app.get("/api/bootstrap-admin", (req, res) => {
    res.json({ 
      instruction: "Initial admin setup. Email: admin@school.local, Pass: admin123",
      adminEmail: "admin@school.local",
      adminPass: "admin123"
    });
  });

  app.post("/api/generate", async (req, res) => {
    const { data, imageParts, locale, apiKey: clientApiKey } = req.body;
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: "Gemini API key is required" });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const isCv5512 = data.template === 'cv5512';
    const prompt = isCv5512 ? getPrompt5512(data, locale) : getPrompt2345(data, locale);
    const schema = isCv5512 ? lessonPlan5512Schema : lessonPlan2345Schema;

    const CANDIDATE_MODELS = [
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-1.5-flash',
      'gemini-flash-latest'
    ];

    try {
      let jsonText: string | null = null;
      let lastError: any = null;

      for (const model of CANDIDATE_MODELS) {
        try {
          console.log(`[AI Server] Requesting lesson plan with model: ${model}`);
          const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }, ...imageParts] },
            config: {
              responseMimeType: 'application/json',
              responseSchema: schema,
            }
          });

          jsonText = response.text?.trim() || null;
          if (jsonText) {
            console.log(`[AI Server] Successfully generated lesson plan with model: ${model}`);
            break;
          }
        } catch (modelErr: any) {
          lastError = modelErr;
          console.warn(`[AI Server] Model ${model} encountered an issue:`, modelErr.message || modelErr);

          const isTransient = 
            modelErr.message?.includes('503') ||
            modelErr.message?.includes('UNAVAILABLE') ||
            modelErr.message?.includes('high demand') ||
            modelErr.message?.includes('429') ||
            modelErr.message?.includes('RESOURCE_EXHAUSTED') ||
            modelErr.message?.includes('quota');

          if (isTransient) {
            // Wait 2 seconds (increased from 1s) and fall back to the next model
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }

          // If it's a non-recoverable error, break immediately
          break;
        }
      }

      if (!jsonText) {
        throw lastError || new Error("Empty response from AI");
      }
      
      const result = JSON.parse(jsonText);
      const resultArray = Array.isArray(result) ? result : [result];

      const finalResult = resultArray.map((plan: any) => {
        const rawPeriods = plan.periods ?? 1;
        const parsedPeriods = parseInt(String(rawPeriods).replace(/\D/g, ''), 10);
        return {
          ...plan,
          template: data.template,
          periods: isNaN(parsedPeriods) ? 1 : parsedPeriods,
        };
      });

      res.json(finalResult);
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to generate content"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
