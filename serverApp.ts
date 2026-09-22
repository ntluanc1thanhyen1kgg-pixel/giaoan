import express from "express";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";

export function createApp() {
  const app = express();

  app.use(cors());

  // Safe body parsing for Vercel & Express environments
  app.use((req: any, res: any, next: any) => {
    if (req.body && typeof req.body === 'object') {
      return next();
    }
    express.json({ limit: '50mb' })(req, res, next);
  });

  app.use((req: any, res: any, next: any) => {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {
        // Ignore JSON parse error
      }
    }
    next();
  });

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
8.  **ĐỊNH HƯỚNG NĂNG LỰC SỐ (NLS - THEO THÔNG TƯ 02/2025/TT-BGDĐT & CÔNG VĂN 3456/BGDĐT-GDPT):**
    - **Cấu trúc mã NLS bắt buộc:** Ghi đúng định dạng quy chuẩn \`[Mã_Năng_Lực_Thành_Phần].[Mức_Độ_Năng_Lực][Chỉ_Báo]\` (Ví dụ: \`1.3.CB1a\`, \`3.4.CB1a\`, \`4.1.CB1a\`, \`3.3.CB2a\`, \`4.2.CB2a\`, \`5.2.CB2b\`).
      + Trong đó Mã_Năng_Lực_Thành_Phần: Ví dụ \`1.3\` (Quản lý dữ liệu, thông tin và nội dung số), \`3.1\` (Phát triển nội dung số), \`3.3\` (Bản quyền và giấy phép), \`3.4\` (Lập trình), \`4.1\` (Bảo vệ thiết bị), \`4.2\` (Bảo vệ dữ liệu cá nhân), \`4.3\` (Bảo vệ sức khỏe và an sinh số), \`5.1\` (Giải quyết vấn đề kỹ thuật), \`5.2\` (Xác định nhu cầu và giải pháp công nghệ), v.v.
      + Mức_Độ_Năng_Lực:
        * Với học sinh Lớp 1, Lớp 2, Lớp 3: Bắt buộc dùng mức độ \`CB1\` (Cơ bản 1).
        * Với học sinh Lớp 4, Lớp 5: Bắt buộc dùng mức độ \`CB2\` (Cơ bản 2).
      + Chỉ_Báo: Các chữ cái thường \`a\`, \`b\`, \`c\`... biểu thị chỉ báo năng lực cụ thể theo Khung NLS.
    - **Tích hợp:** Ghi trực tiếp vào 'Hoạt động của học sinh' (studentAction/studentActivity) theo dạng \`(NLS [Mã] - [Diễn giải chỉ báo])\`.
    - **Yêu cầu:** Phải nêu rõ nhiệm vụ cụ thể của học sinh liên quan đến việc sử dụng công cụ số, thiết bị số hoặc giải quyết vấn đề số.
    - **Cập nhật tổng hợp:** Ghi rõ mã NLS này vào phần 'Nội dung tích hợp' / 'Định hướng năng lực số' ở mục Yêu cầu cần đạt.
`;
      }
      return `8. **ĐỊNH HƯỚNG NĂNG LỰC SỐ (NLS):** Không yêu cầu tích hợp.`;
  };

  const getSTEMIntegrationPrompt = (integrate: boolean, locale: 'vi' | 'en'): string => {
      if (!integrate) return '';
      
      if (locale === 'en') {
          return `
9.  **STEM INTEGRATION (OFFICIAL LETTER 909/BGDDT-GDTH):**
    - **Identification & Analysis:** Analyze the lesson topic, grade level, and subject to identify the exact interdisciplinary STEM connections (Science/Math/Technology/Engineering/Art).
    - **Objectives & Materials:**
      + In 'integratedContent' / Objectives: Clearly state the STEM goals, knowledge integration, and product requirements.
      + In 'teacherPrep' / 'studentPrep': Specify required STEM tools and materials (paper, cardboard, scissors, tape, recyclable items, assemblies).
    - **Explicit Integration in Activities (FOR EASY CHECKING):**
      + Prefix the integrated activities with clear markers in 'activityName' or 'studentAction': e.g., \`[TÍCH HỢP STEM - Khám phá & Thiết kế giải pháp]\`, \`[TÍCH HỢP STEM - Chế tạo sản phẩm & Thử nghiệm]\`, \`[TÍCH HỢP STEM - Trưng bày & Đánh giá]\`.
      + **Teacher Action:** Provide step-by-step guidance on problem definition, design criteria, engineering constraints, and testing protocols.
      + **Student Action:** Detail concrete actions: group discussion, drafting design sketches, constructing STEM products, testing functionality, and presenting outcomes.
      + Make all STEM elements transparent and structured so that school inspectors/reviewers can immediately identify and evaluate STEM implementation.
`;
      }

      return `
9.  **TÍCH HỢP GIÁO DỤC STEM (THEO CÔNG VĂN 909/BGDĐT-GDTH VỀ HƯỚNG DẪN TỔ CHỨC GIÁO DỤC STEM CẤP TIỂU HỌC):**
    - **TỰ ĐỘNG NHẬN DẠNG BÀI HỌC VÀ CHỦ ĐỀ STEM:**
      + Tự động phân tích tên bài dạy, môn học và khối lớp để xác định đúng địa chỉ/nội dung có thể tích hợp STEM liên môn (kết hợp Môn chủ đạo với Khoa học/Tự nhiên & Xã hội, Toán, Công nghệ, Tin học, Mỹ thuật).
    - **YÊU CẦU CẦN ĐẠT & ĐỒ DÙNG DẠY HỌC STEM:**
      + Trong mục Yêu cầu cần đạt / Nội dung tích hợp: Nêu rõ mục tiêu "Tích hợp Giáo dục STEM", các kiến thức liên môn được vận dụng và tiêu chí sản phẩm STEM cần đạt.
      + Trong mục Đồ dùng dạy học (teacherPrep, studentPrep): Liệt kê chi tiết các vật liệu, dụng cụ thực hành STEM (bìa carton, kéo, băng dính, vật liệu tái chế, bộ lắp ghép mô hình, thước kẻ, màu vẽ...).
    - **THIẾT KẾ CỤ THỂ VÀ BẮT BUỘC ĐÁNH DẤU TRONG CÁC HOẠT ĐỘNG (GIÚP NGƯỜI KIỂM TRA DỄ NHẬN BIẾT):**
      + Tại các hoạt động học có tích hợp STEM, BẮT BUỘC gắn nhãn rõ ràng ở đầu tên hoạt động hoặc phần mô tả, ví dụ: \`[TÍCH HỢP STEM - Khám phá giải pháp & Thiết kế]\`, \`[TÍCH HỢP STEM - Chế tạo sản phẩm & Thử nghiệm]\`, \`[TÍCH HỢP STEM - Trưng bày & Đánh giá sản phẩm]\`.
      + **Hoạt động của Giáo viên (teacherAction):** Hướng dẫn rõ ràng quy trình kỹ thuật STEM (Đặt vấn đề thực tiễn -> Hướng dẫn tiêu chí sản phẩm -> Gợi mở ý tưởng thiết kế -> Hướng dẫn thao tác chế tạo an toàn -> Tổ chức thử nghiệm, đánh giá).
      + **Hoạt động của Học sinh (studentAction):** Mô tả hành động cụ thể chi tiết (Thảo luận nhóm tìm giải pháp, phác thảo bản vẽ thiết kế sản phẩm STEM, sử dụng dụng cụ cắt dán/lắp ráp hoàn thiện sản phẩm, thử nghiệm hoạt động thực tế, báo cáo trưng bày và tự đánh giá/đánh giá bạn).
    - **Yêu cầu trình bày:** Các nội dung STEM phải được mô tả rõ ràng, mạch lạc, thực tế và sâu sắc để Ban giám hiệu/Thanh tra khi kiểm tra giáo án nhận biết được ngay lập tức bài dạy có tích hợp STEM ở hoạt động nào, nội dung gì và sản phẩm cụ thể ra sao.
`;
  };

  const getDigitalCitizenshipPrompt = (integrate: boolean, locale: 'vi' | 'en'): string => {
      if (!integrate) return '';

      if (locale === 'en') {
          return `
10. **DIGITAL CITIZENSHIP INTEGRATION (OFFICIAL LETTER 3899/BGDDT-GDTH - "DIGITAL CITIZENSHIP JOURNEY"):**
    - **Automatic Identification:** Automatically analyze lesson topic, subject, and grade level to map relevant digital citizenship topics (Digital Footprint, Cyber Safety, Netiquette, Privacy & Copyright, Media Literacy, Balanced Screen Time).
    - **Objectives & Integration Scope:** Clearly state "Digital Citizenship Integration (CV 3899/BGDDT-GDTH - Digital Citizenship Journey)" in Objectives/Integrated Content.
    - **Explicit Integration Markers (FOR EASY CHECKING):**
      + Prefix integrated activities clearly: e.g., \`[TÍCH HỢP CÔNG DÂN SỐ - An toàn mạng & Bảo mật thông tin cá nhân]\` or \`[TÍCH HỢP CÔNG DÂN SỐ - Ứng xử văn minh trên môi trường số]\`.
      + **Teacher Action:** Present real-life digital scenarios, prompt discussions on digital ethics, guide students on safety rules and digital citizenship habits.
      + **Student Action:** Detail student discussions, situational analysis, personal reflection, and practicing digital rules.
`;
      }

      return `
10. **TÍCH HỢP GIÁO DỤC CÔNG DÂN SỐ (THEO CÔNG VĂN 3899/BGDĐT-GDTH & TÀI LIỆU/SGK HÀNH TRÌNH CÔNG DÂN SỐ):**
    - **TỰ ĐỘNG NHẬN DẠNG BÀI HỌC VÀ CHỦ ĐỀ CÔNG DÂN SỐ:**
      + Tự động phân tích Tên bài dạy, Môn học và Khối lớp để đối chiếu và xác định nội dung tích hợp Công dân số chuẩn xác theo từng tiết dạy (tham chiếu các mạch chủ đề trong SGK "Hành trình công dân số" như: Vết chân số & Danh tính số, An toàn & Bảo mật thông tin cá nhân, Văn hóa ứng xử trên mạng (Netiquette), Bản quyền & Đạo đức số, Cân bằng thời gian sử dụng thiết bị...).
    - **YÊU CẦU CẦN ĐẠT & NỘI DUNG TÍCH HỢP:**
      + Trong mục Yêu cầu cần đạt / Nội dung tích hợp: Nêu rõ "Tích hợp Giáo dục Công dân số (Công văn 3899/BGDĐT-GDTH - Tham chiếu SGK Hành trình công dân số)", chỉ rõ kĩ năng/thái độ công dân số cần hình thành.
    - **THIẾT KẾ CỤ THỂ VÀ BẮT BUỘC ĐÁNH DẤU TRONG CÁC HOẠT ĐỘNG (GIÚP NGƯỜI KIỂM TRA DỄ NHẬN BIẾT):**
      + Tại hoạt động dạy học được lồng ghép, BẮT BUỘC gắn nhãn trực quan nổi bật ở đầu tên hoạt động hoặc phần mô tả, ví dụ:
        * \`[TÍCH HỢP CÔNG DÂN SỐ - Chủ đề: Bảo vệ thông tin cá nhân & An toàn mạng (SGK Hành trình công dân số)]\`
        * \`[TÍCH HỢP CÔNG DÂN SỐ - Chủ đề: Văn hóa ứng xử văn minh trên môi trường số (SGK Hành trình công dân số)]\`
        * \`[TÍCH HỢP CÔNG DÂN SỐ - Chủ đề: Tôn trọng bản quyền & Tác quyền số (SGK Hành trình công dân số)]\`
      + **Hoạt động của Giáo viên (teacherAction):** Nêu rõ tình huống thực tế số, câu hỏi gợi mở suy ngẫm, hướng dẫn cụ thể các nguyên tắc và thói quen công dân số văn minh, an toàn, có trách nhiệm.
      + **Hoạt động của Học sinh (studentAction):** Mô tả hành động cụ thể (Thảo luận nhóm xử lý tình huống ứng xử số, phân tích hành vi đúng/sai trên mạng, liên hệ thói quen bản thân, đưa ra cam kết thực hiện đúng quy tắc Công dân số).
    - **Yêu cầu trình bày:** Nội dung tích hợp Công dân số phải được thể hiện tường minh, chi tiết và thiết thực giúp Ban giám hiệu/Thanh tra kiểm tra giáo án dễ dàng nhận biết bài dạy được tích hợp ở hoạt động nào, bài nào trong SGK Hành trình công dân số và kết quả đạt được ra sao.
`;
  };

  const getDefenseSecurityPrompt = (integrate: boolean, locale: 'vi' | 'en'): string => {
      if (!integrate) return '';

      if (locale === 'en') {
          return `
11. **NATIONAL DEFENSE AND SECURITY EDUCATION INTEGRATION (ANQP):**
    - **Automatic Identification:** Automatically analyze lesson topic, subject, and grade level to map appropriate National Defense & Security Education topics.
    - **Objectives & Integrated Content:** In Objectives / Integrated Content, state: "National Defense and Security Education Integration (ANQP)".
    - **Explicit Integration Markers (FOR EASY CHECKING):**
      + Prefix integrated activities clearly with markers: e.g., \`[TÍCH HỢP ANQP - Patriotism & Army/Police Images]\` or \`[TÍCH HỢP ANQP - Affirming Island Sovereignty (Hoang Sa & Truong Sa)]\`.
      + **Teacher Action:** Present images/historical videos, ask open-ended questions about heroism, army/police duties, national security, or island sovereignty.
      + **Student Action:** Share knowledge, discuss historical heroes, express pride and gratitude, and practice discipline.
`;
      }

      return `
11. **TÍCH HỢP GIÁO DỤC QUỐC PHÒNG VÀ AN NINH - ANQP (THEO HƯỚNG DẪN BỘ GD&ĐT DÀNH CHO TIỂU HỌC):**
    - **TỰ ĐỘNG NHẬN DẠNG BÀI HỌC VÀ CHỦ ĐỀ ANQP THEO KHỐI LỚP:**
      + Tự động phân tích Tên bài dạy, Môn học và Khối lớp để đối chiếu nội dung lồng ghép ANQP chuẩn xác:
        * **Môn học trọng tâm lồng ghép:** Tiếng Việt, Tự nhiên và Xã hội, Đạo đức, Lịch sử và Địa lí, Nghệ thuật (Âm nhạc, Mĩ thuật), Hoạt động trải nghiệm.
        * **Chủ đề chung (Lớp 1 đến Lớp 5):** Giáo dục tình yêu quê hương, yêu hòa bình, yêu Tổ quốc Việt Nam XHCN; niềm tự hào, tự tôn dân tộc; lòng biết ơn các anh hùng, liệt sĩ trong xây dựng và bảo vệ Tổ quốc; bảo vệ an ninh quốc gia, giữ gìn trật tự an toàn xã hội; giới thiệu chủ quyền biển, đảo của Việt Nam; giáo dục tinh thần đoàn kết, tương trợ, có ý thức tổ chức kỷ luật trong học tập.
        * **Mạch nội dung cụ thể theo khối lớp:**
          - **Khối Lớp 1:** Tình yêu quê hương, yêu hòa bình, yêu Tổ quốc Việt Nam XHCN; giới thiệu hình ảnh về Quân đội Nhân dân Việt Nam và Công an Nhân dân Việt Nam; di tích lịch sử địa phương.
          - **Khối Lớp 2:** Tinh thần đoàn kết toàn dân tộc, sự hi sinh của các chiến sĩ cách mạng trong kháng chiến chống Pháp và Mỹ; hình ảnh cán bộ, chiến sĩ QĐNDVN, CANDVN làm nhiệm vụ bảo vệ Tổ quốc và giữ gìn trật tự, an toàn xã hội; yêu thương, chia sẻ, bảo vệ nhau trong học tập.
          - **Khối Lớp 3:** Truyền thống chống giặc ngoại xâm của dân tộc; những tấm gương dũng cảm của thiếu niên, nhi đồng, Bà Mẹ Việt Nam Anh hùng trong sự nghiệp giải phóng dân tộc; hoạt động học sinh tham gia bảo vệ môi trường ở địa phương và nhà trường.
          - **Khối Lớp 4:** Giới thiệu bản đồ hành chính Việt Nam, khẳng định chủ quyền của Việt Nam đối với quần đảo Hoàng Sa và Trường Sa; bài hát về biển, đảo Việt Nam; ý thức chấp hành pháp luật về trật tự, an toàn giao thông.
          - **Khối Lớp 5:** Chủ quyền, quyền chủ quyền biển, đảo của Việt Nam; hình ảnh khai thác thủy hải sản và tài nguyên phát triển kinh tế - xã hội gắn với bảo đảm quốc phòng, an ninh; gương dũng cảm của cán bộ, chiến sĩ QĐNDVN và CANDVN trong cứu hộ, cứu nạn.
    - **YÊU CẦU CẦN ĐẠT & NỘI DUNG TÍCH HỢP:**
      + Trong mục Yêu cầu cần đạt / Nội dung tích hợp: Nêu rõ "Tích hợp Giáo dục Quốc phòng và An ninh (ANQP)" và chỉ rõ chủ đề lồng ghép cụ thể tương ứng với bài học và khối lớp.
    - **THIẾT KẾ CỤ THỂ VÀ BẮT BUỘC ĐÁNH DẤU TRONG CÁC HOẠT ĐỘNG (GIÚP NGƯỜI KIỂM TRA DỄ NHẬN BIẾT):**
      + Tại hoạt động dạy học được lồng ghép, BẮT BUỘC gắn nhãn trực quan nổi bật ở đầu tên hoạt động hoặc phần mô tả, ví dụ:
        * \`[TÍCH HỢP ANQP - Chủ đề: Tình yêu quê hương & Hình ảnh Bộ đội, Công an]\`
        * \`[TÍCH HỢP ANQP - Chủ đề: Truyền thống chống giặc ngoại xâm & Gương dũng cảm thiếu niên]\`
        * \`[TÍCH HỢP ANQP - Chủ đề: Khẳng định chủ quyền biển đảo Hoàng Sa & Trường Sa]\`
        * \`[TÍCH HỢP ANQP - Chủ đề: Quyền chủ quyền biển đảo & Cứu hộ cứu nạn]\`
      + **Hoạt động của Giáo viên (teacherAction):** Trình chiếu tranh ảnh/bản đồ/video clip minh họa, nêu câu hỏi gợi mở suy ngẫm về truyền thống lịch sử, hình ảnh chú bộ đội/chiến sĩ công an, khẳng định chủ quyền biển đảo, giáo dục lòng biết ơn và ý thức kỷ luật.
      + **Hoạt động của Học sinh (studentAction):** Báo cáo hiểu biết, thảo luận nhóm, xem hình ảnh/bản đồ, bày tỏ niềm tự hào dân tộc và lòng biết ơn các anh hùng liệt sĩ, thể hiện cam kết học tập tốt, chấp hành kỷ luật và bảo vệ môi trường/biển đảo.
    - **Yêu cầu trình bày:** Nội dung tích hợp ANQP phải được mô tả rõ ràng, cụ thể, sâu sắc để Ban giám hiệu/Thanh tra khi kiểm tra giáo án nhận biết được ngay lập tức bài dạy được tích hợp ở hoạt động nào, nội dung gì và bài học lịch sử/quốc phòng an ninh đạt được ra sao.
`;
  };

  const getAIPrompt = (integrate: boolean, locale: 'vi' | 'en'): string => {
      if (!integrate) return '';

      if (locale === 'en') {
          return `
12. **ARTIFICIAL INTELLIGENCE EDUCATION INTEGRATION (DECISION 2422/QĐ-BGDĐT DATED AUGUST 18, 2026 OF MOET):**
    - **Automatic Identification:** Analyze lesson topic, subject, and grade to integrate AI education topics aligned with MOET Framework (4 Core Strands: NLa - Human-Centered Thinking, NLb - AI Ethics, NLc - AI Techniques & Applications, NLd - AI System Design).
    - **Objectives & Integrated Content:** In Objectives / Integrated Content, explicitly state "AI Education Integration (Decision 2422/QĐ-BGDĐT)".
    - **Explicit Integration Markers (FOR EASY CHECKING):**
      + Prefix integrated activities clearly with markers: e.g., \`[TÍCH HỢP GIÁO DỤC AI - Mạch: Tư duy lấy con người làm trung tâm / Đạo đức AI / Ứng dụng AI]\`.
      + **Teacher Action:** Guide students on observing AI features, prompt discussion on human control over AI, explain AI safety/privacy, and facilitate hands-on visual AI model experiences.
      + **Student Action:** Analyze human vs AI roles, discuss ethical AI scenarios, experience age-appropriate visual AI tools, and reflect on responsible AI usage.
`;
      }

      return `
12. **TÍCH HỢP GIÁO DỤC TRÍ TUỆ NHÂN TẠO - AI (THEO QUYẾT ĐỊNH SỐ 2422/QĐ-BGDĐT NGÀY 18/8/2026 CỦA BỘ GIÁO DỤC VÀ ĐÀO TẠO):**
    - **TỰ ĐỘNG NHẬN DẠNG BÀI HỌC VÀ CHỦ ĐỀ GIÁO DỤC AI THEO KHỐI LỚP & NỘI DUNG TÀI LIỆU HƯỚNG DẪN:**
      + Tự động phân tích Tên bài dạy, Môn học và Khối lớp để xác định đúng bài dạy, tiết dạy và hoạt động phù hợp lồng ghép nội dung Giáo dục AI theo Khung chuẩn Bộ GD&ĐT (4 Mạch nội dung: NLa - Tư duy lấy con người làm trung tâm; NLb - Đạo đức AI; NLc - Các kỹ thuật và ứng dụng AI; NLd - Thiết kế hệ thống AI).
      + **Chi tiết tham chiếu mạch nội dung theo lứa tuổi Học sinh Tiểu học (QĐ 2422/QĐ-BGDĐT):**
        * **Lớp 1:** Nhận biết con người có cảm xúc thật còn AI thì không (1.A1.1); AI thể hiện cảm xúc do con người lập trình (1.A1.3); Nhận diện thiết bị có AI trong cuộc sống (1.A2.2); Máy thông minh làm việc tốt vì mục đích tốt (1.B3.2); Nhận biết thiết bị thông minh có camera là "mắt", micro là "tai" (1.C1.3); Máy học từ ví dụ (1.D1.1).
        * **Lớp 2:** Khi nào nên và không nên dùng AI (2.A1.1, 2.A1.2); AI làm việc con người kiểm soát (2.A1.3); AI trong gia đình & hỗ trợ mọi người (2.A2.1); Sự đối xử không công bằng/thiên kiến của AI (2.B1.1); Dữ liệu là ví dụ để dạy AI (2.C1.1); Sơ lược cách AI phân loại đồ vật (2.C3.1); Ý tưởng máy thông minh giải quyết vấn đề (2.D1.2).
        * **Lớp 3:** Cách sử dụng AI trong học tập (3.A1.1); Không phụ thuộc hoàn toàn vào AI (3.A1.3); Suy nghĩ kỹ và kiểm tra trước khi dùng AI (3.A1.4, 3.A1.5); Kiểm tra và phản biện kết quả AI (3.A3.1, 3.A3.2); Phân biệt thông tin thật và giả do AI tạo ra (3.B2.1); Dữ liệu học máy & Kỹ thuật AI dựa trên luật "nếu... thì..." (3.C5.1); Quá trình huấn luyện máy thông minh (3.D1.1).
        * **Lớp 4:** AI trong công việc hằng ngày (nông nghiệp, y tế, giao thông - 4.A1.1); AI hỗ trợ - con người suy nghĩ (4.A1.2); Con người quyết định khi dùng AI (4.A3.1); Bảo vệ thông tin cá nhân và tài khoản khi dùng AI (4.B2.1, 4.B2.2); Làm quen với công cụ trải nghiệm kỹ thuật học máy trực quan (Teachable Machine, ML for Kids - 4.C5.MR1); Ý tưởng AI giải quyết vấn đề gần gũi ở Việt Nam (4.D1.1).
        * **Lớp 5:** Con người chịu trách nhiệm cuối cùng về quyết định do AI tạo ra (5.A1.1, 5.A1.MR1); AI phục vụ lợi ích chung của xã hội (5.A2.2); Hệ thống AI công bằng (5.B1.1, 5.B1.2); Cần hiểu cách AI đưa ra quyết định (5.B3.1); Thuật toán AI dựa trên luật "nếu... thì..." & Học máy trực quan (5.C5.1, 5.C5.2); Huấn luyện mô hình phân loại đơn giản & Cải tiến hệ thống AI bằng dữ liệu (5.C5.MR2, 5.D1.1, 5.D2.1).
    - **YÊU CẦU CẦN ĐẠT & NỘI DUNG TÍCH HỢP:**
      + Trong mục Yêu cầu cần đạt / Nội dung tích hợp: Nêu rõ "Tích hợp Giáo dục Trí tuệ nhân tạo - AI (Quyết định 2422/QĐ-BGDĐT)", chỉ rõ thành phần năng lực AI (NLa, NLb, NLc, NLd) và mã yêu cầu cần đạt cụ thể theo lớp.
    - **THIẾT KẾ CỤ THỂ VÀ BẮT BUỘC ĐÁNH DẤU TRONG CÁC HOẠT ĐỘNG (GIÚP NGƯỜI KIỂM TRA DỄ NHẬN BIẾT):**
      + Tại hoạt động dạy học được lồng ghép, BẮT BUỘC gắn nhãn trực quan nổi bật ở đầu tên hoạt động hoặc phần mô tả, ví dụ:
        * \`[TÍCH HỢP GIÁO DỤC AI - Mạch NLa: Tư duy lấy con người làm trung tâm (AI hỗ trợ - Con người kiểm soát)]\`
        * \`[TÍCH HỢP GIÁO DỤC AI - Mạch NLb: Đạo đức AI & An toàn thông tin cá nhân (QĐ 2422/QĐ-BGDĐT)]\`
        * \`[TÍCH HỢP GIÁO DỤC AI - Mạch NLc: Trải nghiệm công cụ ứng dụng AI & Học máy trực quan]\`
        * \`[TÍCH HỢP GIÁO DỤC AI - Mạch NLd: Ý tưởng thiết kế & Huấn luyện mô hình AI đơn giản]\`
      + **Hoạt động của Giáo viên (teacherAction):** Nêu tình huống thực tế sử dụng AI, đưa ra ví dụ trực quan về máy thông minh, hướng dẫn nguyên tắc an toàn/đạo đức AI, hướng dẫn kiểm chứng kết quả từ AI, hoặc tổ chức cho HS trải nghiệm công cụ AI đơn giản.
      + **Hoạt động của Học sinh (studentAction):** Phân tích sự khác biệt giữa tư duy con người và AI, thảo luận nhóm về thái độ sử dụng AI an toàn/có trách nhiệm, trải nghiệm/mô phỏng thao tác với AI, đưa ra ý tưởng dùng AI giải quyết bài toán thực tiễn.
    - **Yêu cầu trình bày:** Nội dung tích hợp AI phải được thiết kế mạch lạc, rõ ràng, sâu sắc để Ban giám hiệu/Thanh tra khi kiểm tra giáo án nhận biết được ngay lập tức bài dạy có tích hợp AI ở hoạt động nào, nội dung gì và năng lực AI đạt được ra sao.
`;
  };

  const getPrompt2345 = (data: any, locale: 'vi' | 'en') => {
      const digitalCompetencyInstruction = getDigitalCompetencyPrompt(data.integrateDigitalCompetency, locale);
      const stemInstruction = getSTEMIntegrationPrompt(data.integrateSTEM, locale);
      const digitalCitizenshipInstruction = getDigitalCitizenshipPrompt(data.integrateDigitalCitizenship, locale);
      const defenseSecurityInstruction = getDefenseSecurityPrompt(data.integrateDefenseSecurity, locale);
      const aiInstruction = getAIPrompt(data.integrateAI, locale);
      const titleInstruction = data.lessonTitle && data.lessonTitle.trim() 
        ? `\nTên bài dạy (Bắt buộc dùng tên này): "${data.lessonTitle.trim()}"` 
        : '\nTên bài dạy: Nhận diện tự động từ tài liệu/hình ảnh/tệp PDF đính kèm hoặc tự đề xuất bài học chuẩn theo môn và lớp.';

      const documentAnalysisInstruction = `
      YÊU CẦU PHÂN TÍCH TÀI LIỆU/PDF/HÌNH ẢNH VÀ SOẠN NỘI DUNG CHI TIẾT:
      - Khi có tệp đính kèm (hình ảnh hoặc tệp PDF bài dạy/Sách giáo khoa), bạn PHẢI đọc, kiểm tra và phân tích KỸ CÀNG toàn bộ nội dung tệp PDF hoặc hình ảnh đó.
      - Dựa vào nội dung trong tệp PDF/hình ảnh đính kèm kết hợp với Tên bài dạy (${data.lessonTitle ? `"${data.lessonTitle.trim()}"` : 'Tự nhận diện'}), hãy soạn thảo kế hoạch bài dạy CỰC KỲ CHI TIẾT, ĐẦY ĐỦ MỌI YẾU TỐ BÀI DẠY.
      - Chi tiết hóa từng lời nói, câu hỏi gợi mở, hướng dẫn của Giáo viên (teacherAction) và từng hoạt động, câu trả lời, sản phẩm học tập của Học sinh (studentAction) bám sát tài liệu đính kèm. Tuyệt đối không soạn sơ sài hay tóm tắt chung chung.`;

      if (locale === 'en') {
          return `You are an expert in creating lesson plans. Create a detailed set of Lesson Plans following 'Official Letter 2345' format.
          Subject: ${data.subject}, Grade: ${data.grade}, Teacher: ${data.teacherName}, Periods: ${data.periods}.${data.lessonTitle ? ` Lesson Title: ${data.lessonTitle}.` : ''}
          Output exactly ${data.periods} lesson plan objects.
          MANDATORY RULE: EACH lesson period MUST contain ALL 4 core teaching activities:
          1. Warm-up / Introduction
          2. Knowledge Formation / Discovery
          3. Practice
          4. Application
          Do not omit any activity from any period.
          Examine any attached PDF or image documents thoroughly and write an extremely detailed, comprehensive lesson plan.
          ${digitalCompetencyInstruction}
          ${stemInstruction}
          ${digitalCitizenshipInstruction}
          ${defenseSecurityInstruction}
          ${aiInstruction}`;
      }
      return `Bạn là chuyên gia soạn giáo án Việt Nam. Tạo giáo án chi tiết theo mẫu mới (Công văn 2345):
      Môn: ${data.subject}, Lớp: ${data.grade}, GV: ${data.teacherName}, Số tiết: ${data.periods}.${titleInstruction}
      Tạo chính xác ${data.periods} đối tượng giáo án, mỗi đối tượng tương ứng với một tiết học riêng biệt.
      ${documentAnalysisInstruction}

      YÊU CẦU BẮT BUỘC VỀ 4 HOẠT ĐỘNG CHO MỖI TIẾT:
      - BẤT KỂ BÀI HỌC CÓ MẤY TIẾT, MỖI TIẾT HỌC (mỗi đối tượng giáo án trong mảng kết quả) BẮT BUỘC PHẢI CÓ ĐẦY ĐỦ 4 HOẠT ĐỘNG DẠY HỌC SAU:
        1. Hoạt động 1: Mở đầu (Khởi động)
        2. Hoạt động 2: Hình thành kiến thức mới (Khám phá)
        3. Hoạt động 3: Luyện tập (Thực hành)
        4. Hoạt động 4: Vận dụng (Trải nghiệm)
      - Tuyệt đối không được thiếu bất kỳ hoạt động nào trong từng tiết. Đối với bài học kéo dài nhiều tiết, mỗi tiết sẽ dạy một phần nội dung tương ứng nhưng vẫn triển khai trọn vẹn đủ 4 hoạt động trên.

      QUY ĐỊNH VỀ THAO TÁC TRONG MỖI HOẠT ĐỘNG:
      1. KHÔNG ĐƯỢC TẠO trường 'objective' (mục tiêu) cho từng hoạt động dạy học.
      2. MỖI hoạt động dạy học có thể chia làm một hoặc nhiều nhiệm vụ (tasks) tùy theo nội dung bài học.
      3. MỖI nhiệm vụ trong hoạt động PHẢI được làm rõ qua 4 thao tác sau (điền đúng vào schema):
          - Chuyển giao nhiệm vụ học tập
          - Tổ chức cho học sinh thực hiện nhiệm vụ học tập
          - Tổ chức cho học sinh trình bày kết quả và thảo luận
          - Nhận xét, đánh giá thực hiện nhiệm vụ học tập.
      Mỗi thao tác phải có nội dung tương ứng cho cả Giáo viên (teacherAction) và Học sinh (studentAction).
      ${digitalCompetencyInstruction}
      ${stemInstruction}
      ${digitalCitizenshipInstruction}
      ${defenseSecurityInstruction}
      ${aiInstruction}`;
  };

  const getPrompt5512 = (data: any, locale: 'vi' | 'en') => {
      const digitalCompetencyInstruction = getDigitalCompetencyPrompt(data.integrateDigitalCompetency, locale);
      const stemInstruction = getSTEMIntegrationPrompt(data.integrateSTEM, locale);
      const digitalCitizenshipInstruction = getDigitalCitizenshipPrompt(data.integrateDigitalCitizenship, locale);
      const defenseSecurityInstruction = getDefenseSecurityPrompt(data.integrateDefenseSecurity, locale);
      const aiInstruction = getAIPrompt(data.integrateAI, locale);
      const titleInstruction = data.lessonTitle && data.lessonTitle.trim() 
        ? `\nTên bài dạy (Bắt buộc dùng tên này): "${data.lessonTitle.trim()}"` 
        : '\nTên bài dạy: Nhận diện tự động từ tài liệu/hình ảnh/tệp PDF đính kèm hoặc tự đề xuất bài học chuẩn theo môn và lớp.';

      const documentAnalysisInstruction = `
      YÊU CẦU PHÂN TÍCH TÀI LIỆU/PDF/HÌNH ẢNH VÀ SOẠN NỘI DUNG CHI TIẾT:
      - Khi có tệp đính kèm (hình ảnh hoặc tệp PDF bài dạy/Sách giáo khoa), bạn PHẢI đọc, kiểm tra và phân tích KỸ CÀNG toàn bộ nội dung tệp PDF hoặc hình ảnh đó.
      - Dựa vào nội dung trong tệp PDF/hình ảnh đính kèm kết hợp với Tên bài dạy (${data.lessonTitle ? `"${data.lessonTitle.trim()}"` : 'Tự nhận diện'}), hãy soạn thảo kế hoạch bài dạy CỰC KỲ CHI TIẾT, ĐẦY ĐỦ MỌI YẾU TỐ BÀI DẠY.
      - Chi tiết hóa từng nội dung, sản phẩm học tập và tiến trình dạy học (teachingProcess). Tuyệt đối không soạn sơ sài hay tóm tắt chung chung.`;

      if (locale === 'en') {
          return `You are an expert in creating lesson plans. Create a detailed set of Lesson Plans following 'Official Letter 5512' format.
          Subject: ${data.subject}, Grade: ${data.grade}, Teacher: ${data.teacherName}, Periods: ${data.periods}.${data.lessonTitle ? ` Lesson Title: ${data.lessonTitle}.` : ''}
          Output exactly ${data.periods} lesson plan objects.
          MANDATORY RULE: EACH lesson period MUST contain ALL 4 core teaching activities:
          1. Warm-up / Introduction
          2. Knowledge Formation / Discovery
          3. Practice
          4. Application
          Do not omit any activity from any period.
          Examine any attached PDF or image documents thoroughly and write an extremely detailed, comprehensive lesson plan.
          ${digitalCompetencyInstruction}
          ${stemInstruction}
          ${digitalCitizenshipInstruction}
          ${defenseSecurityInstruction}
          ${aiInstruction}`;
      }
      return `Bạn là chuyên gia soạn giáo án Việt Nam. Tạo giáo án chi tiết theo chuẩn Công văn 5512.
      Môn: ${data.subject}, Lớp: ${data.grade}, GV: ${data.teacherName}, Số tiết: ${data.periods}.${titleInstruction}
      Tạo chính xác ${data.periods} đối tượng giáo án, mỗi đối tượng tương ứng với một tiết học riêng biệt (Tiết 1, Tiết 2, ...).
      ${documentAnalysisInstruction}

      YÊU CẦU BẮT BUỘC VỀ 4 HOẠT ĐỘNG CHO MỖI TIẾT:
      - BẤT KỂ BÀI HỌC CÓ MẤY TIẾT, MỖI TIẾT HỌC (mỗi đối tượng giáo án trong mảng kết quả) BẮT BUỘC PHẢI CÓ ĐẦY ĐỦ 4 HOẠT ĐỘNG TRONG 'teachingProcess':
        1. Hoạt động 1: Mở đầu (Khởi động)
        2. Hoạt động 2: Hình thành kiến thức mới (Khám phá)
        3. Hoạt động 3: Luyện tập (Thực hành)
        4. Hoạt động 4: Vận dụng (Trải nghiệm)
      - Tuyệt đối không được bỏ sót bất kỳ hoạt động nào trong từng tiết học. Nếu bài học có nhiều tiết, nội dung kiến thức được phân bổ theo từng tiết nhưng mỗi tiết luôn có trọn vẹn đủ 4 hoạt động này.
      ${digitalCompetencyInstruction}
      ${stemInstruction}
      ${digitalCitizenshipInstruction}
      ${defenseSecurityInstruction}
      ${aiInstruction}`;
  };

  // API Routes (Handle both /api/path and /path in case rewrites alter prefix)
  const handleConfig = (req: any, res: any) => {
    res.json({ hasApiKey: !!process.env.GEMINI_API_KEY });
  };

  const handleBootstrapAdmin = (req: any, res: any) => {
    res.json({ 
      instruction: "Initial admin setup. Email: admin@school.local, Pass: admin123",
      adminEmail: "admin@school.local",
      adminPass: "admin123"
    });
  };

  const handleGenerate = async (req: any, res: any) => {
    try {
      const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { data = {}, imageParts = [], locale = 'vi', apiKey: clientApiKey } = rawBody;
      const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({ 
          error: "Chưa có Gemini API Key. Vui lòng bấm nút 'CÀI ĐẶT API KEY' ở góc trên để dán API Key của bạn và sử dụng ngay." 
        });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const isCv5512 = data?.template === '5512' || data?.template === 'cv5512';
      const prompt = isCv5512 ? getPrompt5512(data, locale) : getPrompt2345(data, locale);
      const schema = isCv5512 ? lessonPlan5512Schema : lessonPlan2345Schema;

      const CANDIDATE_MODELS = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-2.0-flash-lite',
      ];

      let jsonText: string | null = null;
      let lastError: any = null;

      const formattedParts = [{ text: prompt }, ...imageParts];

      // Graceful silent failover loop across high-availability models
      for (const model of CANDIDATE_MODELS) {
        let attempts = 0;
        const maxAttemptsForModel = 2;

        while (attempts < maxAttemptsForModel) {
          attempts++;
          try {
            const response = await ai.models.generateContent({
              model,
              contents: formattedParts,
              config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
              }
            });

            jsonText = response.text?.trim() || null;
            if (jsonText) {
              console.log(`[AI Server] Success generated KHBD using model: ${model}`);
              break;
            }
          } catch (modelErr: any) {
            lastError = modelErr;
            const errMsg = modelErr.message || String(modelErr);
            console.error(`[AI Server] Model ${model} attempt ${attempts} failed:`, errMsg);

            const isInvalidKey = 
              errMsg.includes('API_KEY_INVALID') ||
              errMsg.includes('401') ||
              errMsg.includes('API key not valid');

            if (isInvalidKey) {
              return res.status(400).json({
                error: "Gemini API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại API Key đã nhập hoặc cấu hình trong mục Cài đặt."
              });
            }

            const isPermissionDenied = 
              errMsg.includes('PERMISSION_DENIED') ||
              errMsg.includes('denied access') ||
              errMsg.includes('403');

            if (isPermissionDenied) {
              return res.status(403).json({
                error: "API Key hiện tại bị từ chối truy cập (403 Permission Denied). Vui lòng nhấn nút 'CÀI ĐẶT API KEY' ở góc trên để nhập Gemini API Key của bạn."
              });
            }

            const isTransient = 
              errMsg.includes('503') ||
              errMsg.includes('UNAVAILABLE') ||
              errMsg.includes('high demand') ||
              errMsg.includes('429') ||
              errMsg.includes('RESOURCE_EXHAUSTED') ||
              errMsg.includes('quota');

            // Quick backoff before model retry or moving quietly to next candidate
            if (isTransient && attempts < maxAttemptsForModel) {
              await new Promise(resolve => setTimeout(resolve, 800));
              continue;
            }

            // Silent failover to next candidate model
            break;
          }
        }

        if (jsonText) {
          break;
        }
      }

      if (!jsonText) {
        const lastMsg = lastError?.message || String(lastError || '');
        const isHighDemand = lastMsg.includes('503') || lastMsg.includes('UNAVAILABLE') || lastMsg.includes('high demand');
        const isQuota = lastMsg.includes('429') || lastMsg.includes('quota') || lastMsg.includes('RESOURCE_EXHAUSTED');

        if (isHighDemand) {
          return res.status(503).json({
            error: "Hệ thống AI của Google hiện đang có lượng truy cập đột biến (503 High Demand). Vui lòng nhấn nút 'Tạo giáo án' để thử lại sau vài giây hoặc nhập API Key cá nhân trong phần Cài đặt."
          });
        }

        if (isQuota) {
          return res.status(429).json({
            error: "API Key đã đạt giới hạn yêu cầu miễn phí trong phút (429 Quota). Vui lòng đợi khoảng 30 giây rồi bấm thử lại, hoặc thêm API Key mới."
          });
        }

        return res.status(500).json({
          error: `Không nhận được phản hồi từ AI (${lastMsg || 'Lỗi kết nối Gemini'}). Vui lòng kiểm tra lại API Key trong phần Cài đặt.`
        });
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

      return res.json(finalResult);
    } catch (error: any) {
      console.error("Gemini API error:", error);
      return res.status(500).json({ 
        error: error.message || "Đã xảy ra lỗi trên máy chủ khi tạo nội dung."
      });
    }
  };

  app.get("/api/config", handleConfig);
  app.get("/config", handleConfig);

  app.get("/api/bootstrap-admin", handleBootstrapAdmin);
  app.get("/bootstrap-admin", handleBootstrapAdmin);

  app.post("/api/generate", handleGenerate);
  app.post("/generate", handleGenerate);

  return app;
}
