import { NextRequest } from 'next/server';
import mqtt from 'mqtt';

// Глобальний MQTT клієнт (щоб не створювати новий для кожного запиту)
let mqttClient: mqtt.MqttClient | null = null;
let latestTemperature: any = null;

function connectToAWSIoT() {
  if (mqttClient?.connected) {
    return mqttClient;
  }

  const endpoint = process.env.NEXT_PUBLIC_AWS_IOT_ENDPOINT;
  const topic = process.env.NEXT_PUBLIC_AWS_IOT_TOPIC || 'esp32/temperature';

  if (!endpoint) {
    console.error('❌ AWS IoT endpoint не налаштовано');
    return null;
  }

  const wsEndpoint = `wss://${endpoint}/mqtt`;
  
  // Отримуємо сертифікати з .env
  const certCA = process.env.AWS_IOT_CERT_CA;
  const certCRT = process.env.AWS_IOT_CERT_CRT;
  const certPrivate = process.env.AWS_IOT_CERT_PRIVATE;
  
  console.log('🔌 Server: Підключення до AWS IoT Core...');
  console.log('📍 Endpoint:', wsEndpoint);
  console.log('📡 Topic:', topic);
  console.log('🔐 Сертифікати:', {
    ca: certCA ? '✅ Завантажено' : '❌ Відсутній',
    crt: certCRT ? '✅ Завантажено' : '❌ Відсутній',
    key: certPrivate ? '✅ Завантажено' : '❌ Відсутній',
  });

  if (!certCA || !certCRT || !certPrivate) {
    console.error('❌ Відсутні сертифікати! Додай AWS_IOT_CERT_* в .env.local');
    return null;
  }
  
  mqttClient = mqtt.connect(wsEndpoint, {
    clientId: `smart-pot-server-${Math.random().toString(16).slice(2, 10)}`,
    protocol: 'wss',
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    keepalive: 60,
    // TLS сертифікати для авторизації
    ca: certCA,
    cert: certCRT,
    key: certPrivate,
    rejectUnauthorized: true,
  });

  mqttClient.on('connect', () => {
    console.log('✅ Server: Підключено до AWS IoT Core!');
    mqttClient?.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Server: Помилка підписки на топік:', err);
      } else {
        console.log(`📡 Server: Успішно підписано на топік "${topic}"`);
      }
    });
  });

  mqttClient.on('message', (receivedTopic, message) => {
    try {
      latestTemperature = JSON.parse(message.toString());
      console.log('📨 Server: Отримано дані з ESP32:', latestTemperature);
    } catch (err) {
      console.error('❌ Server: Помилка парсингу повідомлення:', err);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('❌ Server: MQTT помилка:', err.message);
    if (err.message.includes('certificate')) {
      console.error('💡 Підказка: Перевір що сертифікати правильно скопійовані в .env.local');
    }
  });

  mqttClient.on('close', () => {
    console.log('🔌 Server: З\'єднання з AWS IoT закрито');
  });

  mqttClient.on('offline', () => {
    console.log('📴 Server: MQTT клієнт offline');
  });

  return mqttClient;
}

// Server-Sent Events endpoint
export async function GET(request: NextRequest) {
  // Підключаємось до AWS IoT
  connectToAWSIoT();

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Відправляємо дані кожні 2 секунди
      const interval = setInterval(() => {
        if (latestTemperature) {
          const data = `data: ${JSON.stringify(latestTemperature)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } else {
          // Якщо ще немає даних, відправляємо статус очікування
          const data = `data: ${JSON.stringify({ 
            status: 'waiting', 
            message: 'Очікування даних з ESP32... Перевір що пристрій увімкнений.' 
          })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      }, 2000);

      // Очистка при закритті з'єднання
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
