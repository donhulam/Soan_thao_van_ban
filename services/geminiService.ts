import { GoogleGenAI, Part, Content } from "@google/genai";
import type { FormData } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const buildContentParts = (data: FormData, contextFileParts: Part[], keyPointsFileParts: Part[]): Part[] => {
  const parts: Part[] = [];

  parts.push({
    text: `
# Nhiệm vụ của bạn

Bạn là một chuyên gia về nghiệp vụ văn thư và soạn thảo văn bản hành chính nhà nước Việt Nam. Bạn được trang bị kiến thức sâu rộng và cập nhật về các văn bản quy phạm pháp luật như Nghị định 30/2020/NĐ-CP, Luật Ban hành Văn bản quy phạm pháp luật 2015 (sửa đổi 2020), và các quy chuẩn trình bày văn bản hành chính nhà nước.

Nhiệm vụ chính của bạn là hỗ trợ người dùng tạo lập các loại văn bản hành chính Việt Nam như Công văn, Quyết định, Tờ trình, Kế hoạch, Báo cáo, và các văn bản khác dựa trên thông tin được cung cấp.

# Quy tắc thực hiện

1.  **Thể thức và Bố cục:** Đảm bảo mọi văn bản được trình bày đúng thể thức, bố cục chuẩn theo Nghị định 30/2020/NĐ-CP (Quốc hiệu, Tiêu ngữ, tên cơ quan, số/ký hiệu, địa danh, ngày tháng, v.v.).
2.  **Ngôn ngữ:** Sử dụng ngôn ngữ hành chính chuẩn xác, trang trọng, khách quan, không sai lỗi chính tả.
3.  **Định dạng:** Phản hồi của bạn phải là dự thảo văn bản hoàn chỉnh. **Chỉ sử dụng định dạng Markdown** (ví dụ: tiêu đề \`#\`, in đậm \`**text**\`, gạch đầu dòng \`-\`) để cấu trúc văn bản rõ ràng, dễ đọc, và dễ sao chép. **Tuyệt đối không sử dụng các thẻ HTML** như \`<table>\`, \`<div>\`, \`<p>\`, hay \`<b>\`.
4.  **Xử lý thông tin đầu vào:**
    *   Phân tích kỹ lưỡng các thông tin chi tiết người dùng cung cấp bên dưới (Loại văn bản, Trích yếu, Nội dung, Căn cứ, Dữ liệu,...).
    *   Nếu người dùng tải lên các tệp tài liệu liên quan (hình ảnh, PDF), hãy đọc, trích xuất tất cả thông tin liên quan (ví dụ: dữ liệu từ biểu đồ, ý chính từ văn bản, bối cảnh từ ảnh) và kết hợp thông tin đó vào văn bản một cách tự nhiên và chính xác.
5.  **Tính chính xác:** Mọi thông tin cung cấp phải có căn cứ, không tự suy luận hoặc đưa ra ý kiến cá nhân không dựa trên quy định pháp luật hoặc thông tin được cung cấp. Không cung cấp lời khuyên pháp lý nằm ngoài phạm vi nghiệp vụ soạn thảo văn bản.

Bây giờ, hãy bắt đầu soạn thảo văn bản dựa trên các thông tin chi tiết dưới đây.
`
  });

  // Add all the form data as distinct text parts.
  parts.push({ text: `**Loại văn bản:** ${data.role || 'Không rõ'}` });
  parts.push({ text: `**Cơ quan ban hành:** ${data.issuingAuthority || 'Không rõ'}` });
  parts.push({ text: `**Trích yếu:** ${data.eventName || 'Không rõ'}` });
  parts.push({ text: `**Sơ lược nội dung cần soạn thảo:** ${data.organizer || 'Không rõ'}` });

  // Context section
  parts.push({ text: `**Căn cứ ban hành văn bản:**` });
  if (data.context) parts.push({ text: data.context });
  if (contextFileParts.length > 0) parts.push(...contextFileParts);
  if (!data.context && contextFileParts.length === 0) parts.push({ text: 'Không có' });


  parts.push({ text: `**Kỳ vọng hiệu quả của văn bản:** ${data.message || 'Không có'}` });
  parts.push({ text: `**Nơi nhận:** ${data.recipients || 'Không có'}` });

  // Key points section
  parts.push({ text: `**Văn bản, tư liệu, số liệu liên quan:**` });
  if (data.keyPoints) parts.push({ text: data.keyPoints });
  if (keyPointsFileParts.length > 0) parts.push(...keyPointsFileParts);
  if (!data.keyPoints && keyPointsFileParts.length === 0) parts.push({ text: 'Không có' });

  return parts;
};

export const generateDocumentStream = async (data: FormData, contextFileParts: Part[], keyPointsFileParts: Part[]) => {
  const parts = buildContentParts(data, contextFileParts, keyPointsFileParts);
  
  const contents = { parts };

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: contents,
    });
    return stream;
  } catch (error) {
    console.error("Error generating document:", error);
    throw new Error("Không thể tạo nội dung. Vui lòng thử lại.");
  }
};

export const generateTitle = async (documentContent: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Dựa vào nội dung văn bản sau, hãy tạo một tiêu đề tóm tắt ngắn gọn và súc tích (dưới 15 từ):\n\n---\n\n${documentContent}`,
    });
    // Clean up the title, remove quotes if any
    return response.text.trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error("Error generating title:", error);
    // Return a default title in case of an error
    return "Văn bản chưa có tiêu đề";
  }
};

export const generateChatResponseStream = async (history: Content[], currentDocument: string) => {
  if (!currentDocument) {
    throw new Error("Cannot generate chat response without a document context.");
  }

  const systemInstruction = `
# Vai trò của bạn
Bạn là một chuyên gia về nghiệp vụ văn thư và soạn thảo văn bản hành chính nhà nước Việt Nam, với kiến thức sâu rộng về Nghị định 30/2020/NĐ-CP và các quy định liên quan. Người dùng đã có một bản dự thảo văn bản và cần bạn hỗ trợ tinh chỉnh.

# Nhiệm vụ của bạn
1.  **Đọc kỹ yêu cầu** của người dùng trong tin nhắn cuối cùng.
2.  Dựa trên yêu cầu đó, hãy **chỉnh sửa văn bản hiện tại** được cung cấp dưới đây.
3.  **Luôn luôn trả về TOÀN BỘ VĂN BẢN ĐÃ ĐƯỢC CHỈNH SỬA**. Không đưa ra lời giải thích, bình luận, hay đoạn văn giới thiệu nào khác. Chỉ trả về nội dung văn bản hoàn chỉnh sau khi đã chỉnh sửa.
4.  **Định dạng:** Chỉ sử dụng định dạng Markdown. **Tuyệt đối không sử dụng các thẻ HTML.** Giữ nguyên cấu trúc và định dạng Markdown của văn bản trừ khi người dùng yêu cầu thay đổi.

# Nguyên tắc tương tác
*   **Chuyên nghiệp và chính xác:** Tông giọng luôn chuyên nghiệp, khách quan. Mọi chỉnh sửa phải tuân thủ quy định về thể thức và ngôn ngữ hành chính.
*   **Làm rõ thông tin:** Nếu yêu cầu của người dùng mơ hồ hoặc thiếu thông tin, hãy chủ động đặt câu hỏi làm rõ để đảm bảo chỉnh sửa đúng ý. Ví dụ: "Để điều chỉnh phần căn cứ pháp lý cho chính xác, bạn vui lòng cho biết văn bản này thuộc thẩm quyền ban hành của cơ quan nào?".
*   **Giới hạn phạm vi:** Không cung cấp lời khuyên pháp lý nằm ngoài phạm vi nghiệp vụ soạn thảo và trình bày văn bản. Nếu yêu cầu nằm ngoài khả năng (ví dụ: tư vấn chiến lược), hãy từ chối một cách lịch sự.

**Văn bản hiện tại để bạn chỉnh sửa:**
---
${currentDocument}
---
`;
  
  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: history,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return stream;
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw new Error("Không thể tạo phản hồi. Vui lòng thử lại.");
  }
};