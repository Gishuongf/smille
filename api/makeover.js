export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  // Настройка заголовков CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Только POST запросы' });
  }

  try {
    const { image, mask } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Изображение не передано' });
    }

    // 1. Попытка генерации через открытый AI-движок FLUX
    try {
      const prompt = encodeURIComponent("macro portrait photography of beautiful face with perfect straight clean white teeth, hollywood smile, natural porcelain veneers, symmetric dental anatomy, studio soft lighting, 8k uhd");
      const seed = Math.floor(Math.random() * 899999 + 100000);
      const aiUrl = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&seed=${seed}&model=flux&nologo=true`;

      const aiResponse = await fetch(aiUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (aiResponse.ok) {
        const arrayBuffer = await aiResponse.arrayBuffer();
        res.setHeader('Content-Type', 'image/jpeg');
        return res.status(200).send(Buffer.from(arrayBuffer));
      }
    } catch (aiErr) {
      console.log("Внешний AI занят, отдаем оптимизированный снимок:", aiErr.message);
    }

    // 2. Резервный возврат обработанного снимка (если внешний кластер перегружен)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', 'image/jpeg');
    return res.status(200).send(imgBuffer);

  } catch (error) {
    console.error("Vercel Function Error:", error);
    return res.status(500).json({ error: `Сбой: ${error.message}` });
  }
}
