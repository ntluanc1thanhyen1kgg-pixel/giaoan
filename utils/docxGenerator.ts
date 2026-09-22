
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, VerticalAlign, TabStopType, TabStopPosition } from 'docx';
import saveAs from 'file-saver';
import type { LessonPlan, LessonPlan2345, Activity2345, LessonPlan5512, Activity5512 } from '../types';

const FONT_FAMILY = "Times New Roman";
const FONT_SIZE = 26; // 13pt * 2
const INDENT_FIRST_LINE = 720; // 0.5 inch indent

// Fix: Corrected the type definition by removing an extra 'typeof'.
type TAlignmentType = (typeof AlignmentType)[keyof typeof AlignmentType];

const createParagraph = (text: string, options: { bold?: boolean; italics?: boolean; isTitle?: boolean; alignment?: TAlignmentType; indent?: { firstLine?: number } } = {}) => {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: options.isTitle ? 32 : FONT_SIZE,
        bold: options.bold || options.isTitle,
        italics: options.italics,
      }),
    ],
    spacing: { after: 120 },
    alignment: options.alignment ?? AlignmentType.JUSTIFIED,
    indent: options.indent,
  });
};

const createRichParagraph = (
    parts: { text: string; bold?: boolean; italics?: boolean; size?: number }[], 
    options: { alignment?: TAlignmentType; indent?: { firstLine?: number } } = {}
) => {
  const { alignment = AlignmentType.JUSTIFIED, indent } = options;
  return new Paragraph({
    children: parts.map(part => new TextRun({
        text: part.text,
        font: FONT_FAMILY,
        size: part.size ?? FONT_SIZE,
        bold: part.bold,
        italics: part.italics,
    })),
    spacing: { after: 120 },
    alignment: alignment,
    indent: indent,
  });
}

// --- CV 2345 DOCX Generation ---
const createActivitiesTable2345 = (activities: Activity2345[], t: (key: string) => string) => {
    const cellMargins = { left: 100, right: 100, top: 80, bottom: 80 };
    const rows = [
        new TableRow({
            children: [
                new TableCell({
                    children: [createParagraph(t('docxTeacherActivity'), { bold: true, alignment: AlignmentType.LEFT })],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: cellMargins,
                }),
                new TableCell({
                    children: [createParagraph(t('docxStudentActivity'), { bold: true, alignment: AlignmentType.LEFT })],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: cellMargins,
                }),
            ],
            tableHeader: true,
        }),
    ];

    activities.forEach(activity => {
        rows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            createParagraph(activity.activityName, { bold: true, alignment: AlignmentType.LEFT }),
                        ],
                        columnSpan: 2,
                        margins: cellMargins,
                        shading: { fill: "FFFFFF" },
                    }),
                ],
            })
        );
        
        activity.tasks.forEach((task, tIndex) => {
            if (task.taskName) {
                rows.push(
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [createParagraph(task.taskName, { bold: true, italics: true, alignment: AlignmentType.LEFT })],
                                columnSpan: 2,
                                margins: cellMargins,
                                shading: { fill: "F9F9F9" },
                            }),
                        ],
                    })
                );
            }

            task.steps.forEach((step, sIndex) => {
                const isLastStep = sIndex === task.steps.length - 1;
                const borderStyle = isLastStep ? BorderStyle.SINGLE : BorderStyle.DASHED;

                const teacherActionParas = step.teacherAction.split('\n').map(line => new Paragraph({
                    children: [new TextRun({ text: line, font: FONT_FAMILY, size: FONT_SIZE })],
                    spacing: { after: 100 },
                    alignment: AlignmentType.JUSTIFIED,
                }));

                const studentActionParas = step.studentAction.split('\n').map(line => new Paragraph({
                    children: [new TextRun({ text: line, font: FONT_FAMILY, size: FONT_SIZE })],
                    spacing: { after: 100 },
                    alignment: AlignmentType.JUSTIFIED,
                }));

                rows.push(
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    ...teacherActionParas
                                ],
                                verticalAlign: VerticalAlign.TOP,
                                margins: cellMargins,
                                borders: {
                                    bottom: { style: borderStyle, size: 1, color: "000000" },
                                }
                            }),
                            new TableCell({
                                children: [
                                    ...studentActionParas
                                ],
                                verticalAlign: VerticalAlign.TOP,
                                margins: cellMargins,
                                borders: {
                                    bottom: { style: borderStyle, size: 1, color: "000000" },
                                }
                            }),
                        ],
                    })
                );
            });
        });
    });

    return new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        },
    });
};

const generateDocx2345 = (plans: LessonPlan2345[], t: (key: string) => string): (Paragraph | Table)[] => {
    const children: (Paragraph | Table)[] = [];

    plans.forEach((plan, index) => {
        if (index > 0) {
            children.push(new Paragraph({ pageBreakBefore: true }));
        }

        children.push(
          new Paragraph({
            text: t('lessonPlanTitle'),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            style: "Title",
          }),
          createRichParagraph([{text: `Môn học: ${plan.subject}; Lớp: ${plan.grade}`, bold: true}], { alignment: AlignmentType.CENTER }),
          createRichParagraph([
              {text: `${plan.lessonTitle} (${plan.periods} tiết); `, bold: true, size: 28},
              {text: `Tiết: ${plan.executionTime}`, bold: true, size: 28},
          ], { alignment: AlignmentType.CENTER }),
          createRichParagraph([
            {text: `Thời gian thực hiện: ${plan.dateRange}`, italics: true}
          ], { alignment: AlignmentType.CENTER }),
          
          new Paragraph({ text: 'I. YÊU CẦU CẦN ĐẠT', heading: HeadingLevel.HEADING_2, style: "Heading2" }),
          createRichParagraph([{text: `1. Năng lực đặc thù: `, bold: true}, {text: plan.requiredOutcomes.specificCompetencies}], { indent: { firstLine: INDENT_FIRST_LINE } }),
          createRichParagraph([{text: `2. Năng lực chung: `, bold: true}, {text: plan.requiredOutcomes.generalCompetencies}], { indent: { firstLine: INDENT_FIRST_LINE } }),
          createRichParagraph([{text: `3. Phẩm chất: `, bold: true}, {text: plan.requiredOutcomes.qualities}], { indent: { firstLine: INDENT_FIRST_LINE } })
        );
        
        if (plan.requiredOutcomes.integratedContent && plan.requiredOutcomes.integratedContent !== 'Không áp dụng.') {
             children.push(createRichParagraph([{text: `${t('integratedContent')} `, bold: true}, {text: plan.requiredOutcomes.integratedContent}], { indent: { firstLine: INDENT_FIRST_LINE } }));
        }

        children.push(
          new Paragraph({ text: 'II. ĐỒ DÙNG DẠY HỌC:', heading: HeadingLevel.HEADING_2, style: "Heading2" }),
          createRichParagraph([{text: `${t('teacherAids')} `, bold: true}, {text: plan.teachingAids.teacher}], { indent: { firstLine: INDENT_FIRST_LINE } }),
          createRichParagraph([{text: `${t('studentAids')} `, bold: true}, {text: plan.teachingAids.student}], { indent: { firstLine: INDENT_FIRST_LINE } }),
          new Paragraph({ text: 'III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU', heading: HeadingLevel.HEADING_2, style: "Heading2" }),
          createActivitiesTable2345(plan.teachingActivities, t),
          new Paragraph({ text: 'IV. ĐIỀU CHỈNH SAU BÀI DẠY (nếu có)', heading: HeadingLevel.HEADING_2, style: "Heading2" }),
          ...[...Array(2)].map(() => new Paragraph({
              children: [new TextRun("\t")],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: 'dot' }],
              spacing: { after: 360 },
          }))
        );
    });
    return children;
};

// --- CV 5512 DOCX Generation ---
const createActivityBox5512 = (activity: Activity5512, t: (key: string) => string): Table => {
    // Helper to create a single paragraph for a section, preserving line breaks from the AI.
    const createSectionParagraph = (labelKey: string, content: string): Paragraph => {
        const textRuns: TextRun[] = [
            new TextRun({ text: t(labelKey) + " ", bold: true, font: FONT_FAMILY, size: FONT_SIZE }),
        ];

        // Split content by newlines and add them with breaks
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            textRuns.push(new TextRun({ text: line, font: FONT_FAMILY, size: FONT_SIZE }));
            if (index < lines.length - 1) {
                textRuns.push(new TextRun({ break: 1 }));
            }
        });

        return new Paragraph({
            children: textRuns,
            spacing: { after: 120 },
            alignment: AlignmentType.JUSTIFIED,
        });
    };
    
    const contentParagraphs = [
        createSectionParagraph('content', activity.content),
        createSectionParagraph('product', activity.product),
        createSectionParagraph('implementation', activity.implementation),
    ];
    
    const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            // Row 1: Activity Title
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ text: activity.activityName, style: "Heading3" })],
                        shading: { fill: "EAEAEA" }, // Light gray background
                        margins: cellMargins,
                    }),
                ],
            }),
            // Row 2: Content
            new TableRow({
                children: [
                    new TableCell({
                        children: contentParagraphs,
                        margins: cellMargins,
                    }),
                ],
            }),
        ],
        borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        },
    });
};

const generateDocx5512 = (plans: LessonPlan5512[], t: (key: string) => string): (Paragraph | Table)[] => {
    const children: (Paragraph | Table)[] = [];
    
    plans.forEach((plan, index) => {
        if (index > 0) {
            children.push(new Paragraph({ pageBreakBefore: true }));
        }

        const headerTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [
                                createRichParagraph([{text: `${t('docxSchool')}: `, bold: true}, {text: plan.school}], { alignment: AlignmentType.LEFT }),
                                createRichParagraph([{text: `${t('docxDepartment')}: `, bold: true}, {text: plan.department}], { alignment: AlignmentType.LEFT }),
                            ],
                            width: { size: 60, type: WidthType.PERCENTAGE },
                            verticalAlign: VerticalAlign.TOP,
                        }),
                        new TableCell({
                            children: [
                                createRichParagraph([{text: `${t('docxTeacher')}: `, bold: true}, {text: plan.teacherName}], { alignment: AlignmentType.LEFT }),
                            ],
                            width: { size: 40, type: WidthType.PERCENTAGE },
                            verticalAlign: VerticalAlign.TOP,
                        }),
                    ],
                }),
            ],
        });


        children.push(
            new Paragraph({ text: t('lessonPlanTitle'), heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, style: "Title" }),
            headerTable,
            
            new Paragraph({ text: '' }),
            createRichParagraph([{text: plan.lessonTitle, bold: true, size: 28}], { alignment: AlignmentType.CENTER }),
            createRichParagraph([{text: `${t('subject')}: `, bold: true}, {text: `${plan.subject}; `}, {text: `${t('grade')}: `, bold: true}, {text: plan.grade}], { alignment: AlignmentType.CENTER }),
            createRichParagraph([
              {text: `${t('executionTime')}: `, bold: true}, 
              {text: `${plan.periods} ${t('period').toLowerCase()}; `},
              {text: `Tiết: `, bold: true},
              {text: `${plan.executionTime}`},
              {text: ` (${t('docxDate')})`, italics: true}
            ], { alignment: AlignmentType.CENTER }),

            new Paragraph({ text: t('objectives'), heading: HeadingLevel.HEADING_2, style: "Heading2" }),
            createRichParagraph([{text: `${t('knowledge')}: `, bold: true}, {text: plan.objectives.knowledge}], { indent: { firstLine: INDENT_FIRST_LINE } }),
            createRichParagraph([{text: `${t('skills')}: `, bold: true}, {text: plan.objectives.skills}], { indent: { firstLine: INDENT_FIRST_LINE } }),
            createRichParagraph([{text: `${t('qualities')}: `, bold: true}, {text: plan.objectives.qualities}], { indent: { firstLine: INDENT_FIRST_LINE } })
        );

        children.push(
            new Paragraph({ text: t('teachingAidsAndMaterials'), heading: HeadingLevel.HEADING_2, style: "Heading2" }),
            ...plan.teachingAidsAndMaterials.split('\n').filter(line => line.trim() !== '').map(line => createParagraph(line, { indent: { firstLine: INDENT_FIRST_LINE } })),

            new Paragraph({ text: t('teachingProcess'), heading: HeadingLevel.HEADING_2, style: "Heading2" }),
            ...plan.teachingProcess.flatMap(activity => [
                createActivityBox5512(activity, t),
                new Paragraph({ text: '' }), // Spacer
            ])
        );
    });
    return children;
};


export const exportToDocx = async (plans: LessonPlan[], t: (key: string) => string, periodLabel?: string) => {
    if (!plans || plans.length === 0) return;

    const template = plans[0].template;
    const children = template === 'cv5512' 
      ? generateDocx5512(plans as LessonPlan5512[], t) 
      : generateDocx2345(plans as LessonPlan2345[], t);
    
    const doc = new Document({
      sections: [{ children }],
      styles: {
          paragraphStyles: [
              { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { font: FONT_FAMILY, size: 32, bold: true } },
              { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { font: FONT_FAMILY, size: FONT_SIZE, bold: true } },
              { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { font: FONT_FAMILY, size: FONT_SIZE, bold: true } },
          ]
      }
    });

    const firstPlan = plans[0];
    const periodSuffix = periodLabel ? `_Tiet_${periodLabel}` : "";
    const fileName = `${t('docxFilenamePrefix')}_${firstPlan.subject.replace(/\s/g, '_')}_${firstPlan.lessonTitle.replace(/\s/g, '_')}${periodSuffix}.docx`
    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);
};
