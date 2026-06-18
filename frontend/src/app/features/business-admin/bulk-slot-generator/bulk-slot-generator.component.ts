import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-bulk-slot-generator',
  templateUrl: 'bulk-slot-generator.component.html',
})
export class BulkSlotGeneratorComponent {
  constructor(private api: ApiService, private toast: ToastService) {}

  form = new FormGroup({
    name: new FormControl(''),
    startTime: new FormControl(''),
    duration: new FormControl(60),
    quantity: new FormControl(1),
  });

  async onGenerate() {
    const formData = this.form.value;
    const slots = Array(formData.quantity).fill({
      name: formData.name,
      startTime: formData.startTime,
      duration: formData.duration,
    });
    await this.api.bulkCreateSlots(slots);
    this.toast.show('Slots creados con éxito');
  }
}