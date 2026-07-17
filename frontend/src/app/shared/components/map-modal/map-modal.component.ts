import { Component, ElementRef, viewChild, signal, output } from '@angular/core';
import * as L from 'leaflet';

export interface MapCoordinates {
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-map-modal',
  imports: [],
  templateUrl: './map-modal.component.html',
  styleUrl: './map-modal.component.css',
  standalone: true
})
export class MapModalComponent {
  // Query selectors modernos usando viewChild (Signals)
  private readonly dialogEl = viewChild<ElementRef<HTMLDialogElement>>('mapDialog');
  private readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  // Evento de salida para enviar las coordenadas al componente padre
  coordinatesSelected = output<MapCoordinates>();

  // Estado reactivo de las coordenadas seleccionadas
  selectedCoords = signal<MapCoordinates | null>(null);

  private map!: L.Map;
  private marker!: L.Marker;

  // Abre el modal y levanta el mapa
  open(initialCoords?: MapCoordinates) {
    this.dialogEl()?.nativeElement.showModal();
    
    // Un pequeño delay asegura que el contenedor del diálogo se renderice 
    // antes de que Leaflet intente calcular las dimensiones del mapa.
    setTimeout(() => {
      this.initMap(initialCoords);
    }, 50);
  }

  // Inicializa la instancia de Leaflet
  private initMap(initialCoords?: MapCoordinates) {
    const defaultLat = initialCoords?.lat ?? 4.7110; // Bogotá por defecto
    const defaultLng = initialCoords?.lng ?? -74.0721;
    
    if (this.map) {
      this.map.remove(); // Limpia mapas previos si existían
    }

    const container = this.mapContainer()?.nativeElement;
    if (!container) return;

    this.map = L.map(container).setView([defaultLat, defaultLng], 12);

    // Servidor de mapas gratuito (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Forzar redibujado para corregir posibles cortes visuales en contenedores dinámicos
    this.map.invalidateSize();

    // Si ya le pasamos coordenadas iniciales, pinta el marcador
    if (initialCoords) {
      this.setMarker(initialCoords.lat, initialCoords.lng);
    }

    // Escuchar el clic en el mapa
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.setMarker(lat, lng);
    });
  }

  // Crea o mueve el marcador en el mapa
  private setMarker(lat: number, lng: number) {
    this.selectedCoords.set({ lat, lng });

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], {
        // Solución a un bug conocido de Webpack/Angular donde no encuentra los iconos por defecto
        icon: L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      }).addTo(this.map);
    }
  }

  confirmSelection() {
    const coords = this.selectedCoords();
    if (coords) {
      this.coordinatesSelected.emit(coords);
      this.close();
    }
  }

  close() {
    this.dialogEl()?.nativeElement.close();
    this.selectedCoords.set(null);
  }
}
