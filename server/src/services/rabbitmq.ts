import amqp from 'amqplib';
import type { Channel } from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

class RabbitMQService {
    private connection: any = null;
    private channel: Channel | null = null;
    private connecting: boolean = false;

    async connect(): Promise<Channel | null> {
        if (this.channel) return this.channel;
        if (this.connecting) {
            // Wait for connection
            while (this.connecting) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.channel;
        }

        this.connecting = true;

        try {
            console.log('🐰 Connecting to RabbitMQ...');
            this.connection = await amqp.connect(RABBITMQ_URL);

            if (this.connection) {
                this.channel = await this.connection.createChannel();

                this.connection.on('error', (err: any) => {
                    console.error('RabbitMQ Connection Error:', err);
                    this.close();
                });

                this.connection.on('close', () => {
                    console.warn('RabbitMQ Connection Closed. Reconnecting...');
                    this.close();
                });

                console.log('✅ Connected to RabbitMQ');
            }
            this.connecting = false;
            return this.channel;
        } catch (err) {
            console.error('❌ Failed to connect to RabbitMQ:', err);
            this.connecting = false;
            return null;
        }
    }

    async close() {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
        } catch (err) {
            // Ignore close errors
        }
        this.channel = null;
        this.connection = null;
    }

    async assertQueue(queueName: string) {
        const channel = await this.connect();
        if (channel) {
            await channel.assertQueue(queueName, { durable: false });
            return channel;
        }
        return null;
    }

    async publishToQueue(queueName: string, data: any) {
        try {
            const channel = await this.assertQueue(queueName);
            if (channel) {
                channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
                return true;
            }
        } catch (err) {
            console.error('Error publishing to queue:', err);
        }
        return false;
    }

    async consume(queueName: string, callback: (data: any) => Promise<void> | void) {
        const channel = await this.assertQueue(queueName);
        if (channel) {
            console.log(`👂 Listening on queue: ${queueName}`);
            channel.consume(queueName, async (msg) => {
                if (msg) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        await callback(content);
                        channel.ack(msg);
                    } catch (err) {
                        console.error('Error processing message:', err);
                        // Nack but don't requeue to avoid infinite loop on bad data
                        channel.nack(msg, false, false);
                    }
                }
            });
        }
    }
}

export const rabbitMQ = new RabbitMQService();
