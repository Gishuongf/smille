export const config = {
  maxDuration: 60, // Разрешаем серверу ждать ответ до 60 секунд
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  // Настройка CORS
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
    if (!image || !mask) {
      return res.status(400).json({ error: 'Изображение или маска не переданы' });
    }

    const HF_TOKEN = "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";
    // Используем самый стабильный сервер Inpainting
    const MODEL_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-inpainting";

    const cleanImage = image.replace(/^data:image\/\w+;base64,/, "");
    const cleanMask = mask.replace(/^data:image\/\w+;base64,/, "");

    // Запрос к нейросети
    const response = await fetch(MODEL_URL, {
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
        "x-use-cache": "false"
      },
      method: "POST",
      body: JSON.stringify({
        inputs: {
          image: cleanImage,
          mask_image: cleanMask
        },
        parameters: {
          prompt: "perfect straight white teeth, hollywood smile, natural dental anatomy, symmetrical veneers, dental photography, 8k uhd",
          negative_prompt: "missing teeth, empty mouth, dark mouth, crooked teeth, yellow teeth, deformed, ugly, bad anatomy, blurry",
          guidance_scale: 8.0
        }
      })
    });

    if (response.status === 503) {
      const waitInfo = await response.json().catch(() => ({}));
      return res.status(503).json({ 
        error: `Нейросеть прогревается на GPU (${Math.round(waitInfo.estimated_time || 15)} сек). Попробуйте еще раз через мгновение.` 
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Ошибка AI: ${errText}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/jpeg');
    return res.status(200).send(buffer);

  } catch (error) {
    console.error("Vercel Function Error:", error);
    return res.status(500).json({ error: `Сбой сервера: ${error.message}` });
  }
}
