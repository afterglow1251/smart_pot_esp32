import mqtt from 'mqtt';

export const dynamic = 'force-dynamic';

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'esp32/temperature';

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      console.log('🔌 SSE клієнт підключився');
      
      // Підключаємось до MQTT
      const client = mqtt.connect(MQTT_BROKER);
      
      client.on('connect', () => {
        console.log('✅ Підключено до MQTT брокера');
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));
        
        client.subscribe(MQTT_TOPIC, (err) => {
          if (err) {
            console.error('❌ Помилка підписки:', err);
          } else {
            console.log(`📡 Підписано на топік: ${MQTT_TOPIC}`);
          }
        });
      });
      
      client.on('message', (topic, message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('📨 Дані з ESP32:', data);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          console.error('❌ Помилка парсингу:', err);
        }
      });
      
      client.on('error', (err) => {
        console.error('❌ MQTT помилка:', err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`));
      });
      
      // Cleanup при відключенні клієнта
      request.signal.addEventListener('abort', () => {
        console.log('🔌 SSE клієнт відключився');
        client.end();
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
