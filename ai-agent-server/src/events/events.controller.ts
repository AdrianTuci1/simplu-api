import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EventsService } from './events.service';

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @EventPattern('api.events')
  async handleApiEvent(@Payload() data: any) {
    // Handle API events
    console.log('Received API event:', data);
  }

  @EventPattern('booking.created')
  async handleBookingCreated(@Payload() data: any) {
    // Handle booking created events
    console.log('Received booking created event:', data);
  }

  @EventPattern('stock.low')
  async handleStockLow(@Payload() data: any) {
    // Handle stock low events
    console.log('Received stock low event:', data);
  }
} 