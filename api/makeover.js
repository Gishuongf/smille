export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, mask } = req.body;
    if (!image || !mask) {
      return res.status(400).json({ error: 'Изображение или маска не переданы' });
    }

    const HF_TOKEN = "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";
    const MODEL_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting";

    // Убираем префиксы data:image... для чистого Base64
    const cleanImage = image.replace(/^data:image\/\w+;base64,/, "");
    const cleanMask = mask.replace(/^data:image\/\w+;base64,/, "");

    // Серверный запрос к нейросети (без ограничений браузера)
    const response = await fetch(MODEL_URL, {
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({
        inputs: {
          image: cleanImage,
          mask_image: cleanMask
        },
        parameters: {
          prompt: "extreme close up of beautiful mouth with perfect straight white teeth, hollywood porcelain veneers, clean natural dental anatomy, symmetric teeth, dental photography, 8k",
          negative_prompt: "toothless, crooked, yellow, gaps, braces, deformed, bad anatomy, blurry",
          guidance_scale: 8.0
        }
      })
    });

    if (response.status === 503) {
      return res.status(503).json({ error: 'Нейросеть просыпается, повторите через 15 секунд' });
    }

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    // Получаем сгенерированную картинку и отдаем браузеру
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/jpeg');
    return res.status(200).send(buffer);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
