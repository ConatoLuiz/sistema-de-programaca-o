import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { CarteiraItem, SlaFaixa } from '../types';
import {
  buscarCampoFlexivel,
  calcularDiasRestantes,
  formatarDataBR,
  obterValorEtapa,
  obterValorProjeto,
  esc,
  PALETA_CORES,
} from '../utils/dataParser';

interface MapTabProps {
  dados: CarteiraItem[];
}

export const MapTab: React.FC<MapTabProps> = ({ dados }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const [filtroSla, setFiltroSla] = useState<SlaFaixa>('todos');

  // Map stage colors
  const mapaCoresEtapas = useMemo(() => {
    const mapa: Record<string, string> = {};
    const unicas = new Set<string>();
    dados.forEach((i) => {
      const e = obterValorEtapa(i);
      if (e) unicas.add(e);
    });
    Array.from(unicas)
      .sort()
      .forEach((e, idx) => {
        mapa[e] = PALETA_CORES[idx % PALETA_CORES.length];
      });
    return mapa;
  }, [dados]);

  // SLA counts
  const contadoresSla = useMemo(() => {
    let violada = 0;
    let ate12 = 0;
    let ate20 = 0;
    let ate30 = 0;
    let total = 0;

    dados.forEach((item) => {
      let latRaw = buscarCampoFlexivel(item, 'LATITUDE', 'LAT');
      let lngRaw = buscarCampoFlexivel(item, 'LONGITUDE', 'LNG', 'LONG');
      if (typeof latRaw === 'string') latRaw = latRaw.replace(',', '.').trim();
      if (typeof lngRaw === 'string') lngRaw = lngRaw.replace(',', '.').trim();
      const lat = parseFloat(latRaw);
      const lng = parseFloat(lngRaw);

      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      const dataLimite = buscarCampoFlexivel(
        item,
        'DATA LIMITE PARA EXECUÇÃO',
        'DATA LIMITE',
        'LIMITE EXECUCAO'
      );
      const dias = calcularDiasRestantes(dataLimite);

      total++;
      if (dias <= 0) violada++;
      else if (dias <= 12) ate12++;
      else if (dias <= 20) ate20++;
      else if (dias <= 30) ate30++;
    });

    return { total, violada, ate12, ate20, ate30 };
  }, [dados]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-22.9068, -43.1729],
        zoom: 11,
      });

      const satelliteTileUrl =
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      const satelliteAttribution =
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

      const camadaSat = L.tileLayer(satelliteTileUrl, {
        attribution: satelliteAttribution,
        maxZoom: 19,
      });

      const camadaCarto = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, attribution: '&copy; CartoDB' }
      );

      const camadaOsm = L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap France',
        maxZoom: 19,
      }).addTo(map);

      L.control
        .layers({
          'Mapa Claro (OSM)': camadaOsm,
          'Mapa Voyager': camadaCarto,
          'Satélite (Esri)': camadaSat,
        })
        .addTo(map);

      const markers = L.layerGroup().addTo(map);
      markersGroupRef.current = markers;
      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Update Markers when dados or filtroSla changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markers = markersGroupRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    const bounds: [number, number][] = [];

    dados.forEach((item) => {
      let latRaw = buscarCampoFlexivel(item, 'LATITUDE', 'LAT');
      let lngRaw = buscarCampoFlexivel(item, 'LONGITUDE', 'LNG', 'LONG');
      if (typeof latRaw === 'string') latRaw = latRaw.replace(',', '.').trim();
      if (typeof lngRaw === 'string') lngRaw = lngRaw.replace(',', '.').trim();
      const lat = parseFloat(latRaw);
      const lng = parseFloat(lngRaw);

      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      const dataLimiteValor = buscarCampoFlexivel(
        item,
        'DATA LIMITE PARA EXECUÇÃO',
        'DATA LIMITE',
        'LIMITE EXECUCAO'
      );
      const diasRestantes = calcularDiasRestantes(dataLimiteValor);

      // Check SLA filter
      let atendeFiltroSla = false;
      if (filtroSla === 'todos') atendeFiltroSla = true;
      else if (filtroSla === 'violada' && diasRestantes <= 0) atendeFiltroSla = true;
      else if (filtroSla === '12dias' && diasRestantes > 0 && diasRestantes <= 12) atendeFiltroSla = true;
      else if (filtroSla === '20dias' && diasRestantes > 12 && diasRestantes <= 20) atendeFiltroSla = true;
      else if (filtroSla === '30dias' && diasRestantes > 20 && diasRestantes <= 30) atendeFiltroSla = true;

      if (!atendeFiltroSla) return;

      bounds.push([lat, lng]);

      const etapaOriginal = obterValorEtapa(item);
      const projetoOriginal = obterValorProjeto(item);
      const pendenciaConstrutiva = String(
        buscarCampoFlexivel(item, 'PENDÊNCIA CONSTRUTIVA?', 'PENDENCIA CONSTRUTIVA?') || ''
      )
        .toUpperCase()
        .trim();

      const dataRecebimentoBR = formatarDataBR(
        buscarCampoFlexivel(item, 'PACOTE', 'DATA PACOTE', 'RECEBIMENTO')
      );
      const dataLimiteBR = formatarDataBR(dataLimiteValor);

      let badgeSlaHtml = '';
      let corAuraSla = '#10B981';

      if (diasRestantes <= 0) {
        corAuraSla = '#EF4444';
        badgeSlaHtml = `<span style="background: rgba(239, 68, 68, 0.15); color: #DC2626; border: 1px solid #DC2626; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-top: 6px; display: block; font-size: 0.8rem;"><i class="fa-solid fa-triangle-exclamation"></i> OBRA VIOLADA! (${Math.abs(diasRestantes)} dias em atraso)</span>`;
      } else if (diasRestantes <= 12) {
        corAuraSla = '#F97316';
        badgeSlaHtml = `<span style="background: rgba(245, 158, 11, 0.15); color: #D97706; border: 1px solid #D97706; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-top: 6px; display: block; font-size: 0.8rem;"><i class="fa-solid fa-clock"></i> CRÍTICO: Faltam apenas ${diasRestantes} dias!</span>`;
      } else if (diasRestantes <= 20) {
        corAuraSla = '#FBBF24';
        badgeSlaHtml = `<span style="background: rgba(251, 191, 36, 0.2); color: #FBBF24; border: 1px solid #FBBF24; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-top: 6px; display: block; font-size: 0.8rem;"><i class="fa-solid fa-clock"></i> ATENÇÃO: Faltam ${diasRestantes} dias</span>`;
      } else if (diasRestantes <= 30) {
        corAuraSla = '#0EA5E9';
      }

      const corNucleoEtapa = mapaCoresEtapas[etapaOriginal] || '#059669';
      let observacaoFinal =
        buscarCampoFlexivel(item, 'OBSERVAÇÕES', 'OBSERVACOES', 'OBS') || 'Nenhuma';
      const pendenciaApontada =
        buscarCampoFlexivel(item, 'PENDÊNCIAS APONTADAS', 'PENDENCIAS APONTADAS') || '';
      if (pendenciaConstrutiva === 'SIM' && pendenciaApontada) observacaoFinal = pendenciaApontada;

      const responsavelVistoria =
        buscarCampoFlexivel(item, 'RESPONSÁVEL', 'RESPONSAVEL', 'RESPONSAVEL VISTORIA') || 'N/D';
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

      const auraMarker = L.circleMarker([lat, lng], {
        radius: 14,
        fillColor: corAuraSla,
        color: corAuraSla,
        weight: 1,
        fillOpacity: 0.35,
      }).addTo(markers);

      const coreMarker = L.circleMarker([lat, lng], {
        radius: 7,
        fillColor: corNucleoEtapa,
        color: '#FFFFFF',
        weight: 2,
        fillOpacity: 1,
      }).addTo(markers);

      const popupContent = `
        <div style="font-size: 0.86rem; line-height: 1.45; padding: 6px; min-width: 270px; color: var(--text-main);">
          <h3 style="color: var(--brand-dark); border-bottom: 1px solid var(--border-light); padding-bottom: 4px; margin-bottom: 8px; font-weight: 800; font-size: 0.95rem;">
            PROJETO: ${esc(projetoOriginal) || 'S/N'}
          </h3>
          <div style="margin-bottom: 3px; font-size: 0.8rem; color: var(--text-muted);">
            <strong style="color: var(--text-main);">Etapa:</strong> 
            <span style="color: ${corNucleoEtapa}; font-weight: bold; background: ${corNucleoEtapa}18; padding: 1px 6px; border-radius: 4px;">${esc(etapaOriginal)}</span>
          </div>
          <div style="margin-bottom: 3px; font-size: 0.8rem; color: var(--text-muted);">
            <strong style="color: var(--text-main);">Base:</strong> ${esc(buscarCampoFlexivel(item, 'BASE')) || 'N/D'} | 
            <strong style="color: var(--text-main);">Bairro:</strong> ${esc(buscarCampoFlexivel(item, 'BAIRRO')) || 'N/D'}
          </div>
          <div style="margin-bottom: 3px; font-size: 0.8rem; color: var(--text-muted);">
            <strong style="color: var(--text-main);">Tipo:</strong> ${esc(buscarCampoFlexivel(item, 'TIPO')) || 'N/D'} | 
            <strong style="color: var(--text-main);">Parceira:</strong> ${esc(buscarCampoFlexivel(item, 'PARCEIRA')) || 'N/D'}
          </div>
          <div style="margin-bottom: 3px; font-size: 0.8rem; color: var(--text-muted);">
            <strong style="color: var(--text-main);">Recebimento:</strong> ${dataRecebimentoBR}
          </div>
          <div style="margin-bottom: 3px; font-size: 0.8rem; color: var(--text-muted);">
            <strong style="color: var(--text-main);">Prazo Limite:</strong> ${dataLimiteBR}
          </div>
          <div style="margin-bottom: 3px; font-size: 0.8rem; color: var(--text-muted);">
            <strong style="color: var(--text-main);">Prioridade:</strong> ${esc(buscarCampoFlexivel(item, 'PRIORIDADE')) || 'N/D'}
          </div>
          <div style="margin-bottom: 3px; font-size: 0.8rem; color: var(--text-muted);">
            <strong style="color: var(--text-main);">Responsável:</strong> ${esc(responsavelVistoria)}
          </div>
          <div style="margin-top: 6px; border-top: 1px solid var(--border-light); padding-top: 4px; font-size: 0.8rem; color: var(--text-muted);">
            <strong style="color: var(--text-main);">Obs / Pendência:</strong> ${esc(observacaoFinal)}
          </div>
          ${badgeSlaHtml}
          <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--brand-primary); color: #FFFFFF !important; text-decoration: none; font-weight: 700; font-size: 0.8rem; padding: 7px 12px; border-radius: 6px; margin-top: 8px; transition: all 0.2s;">
            <i class="fa-solid fa-location-dot"></i> Abrir no Google Maps
          </a>
        </div>
      `;

      auraMarker.bindPopup(popupContent);
      coreMarker.bindPopup(popupContent);
    });

    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch {
        // ignore bounds fit error if container zero
      }
    }
  }, [dados, filtroSla, mapaCoresEtapas]);

  return (
    <div className="relative w-full h-[80vh] min-h-[480px] rounded-xl border border-[var(--border-light)] overflow-hidden shadow-lg">
      {/* Floating SLA Panel */}
      <div className="absolute top-3 right-3 w-[220px] bg-[var(--bg-glass)] backdrop-blur-md border border-[var(--border-light)] border-t-[3px] border-t-[var(--brand-accent)] rounded-lg p-2.5 z-[1000] flex flex-col gap-1.5 shadow-md">
        <div className="text-[11px] font-bold text-[var(--brand-dark)] border-b border-[var(--border-light)] pb-1 uppercase tracking-wider flex items-center justify-between">
          <span>
            <i className="fa-solid fa-clock mr-1"></i> Prazos / SLA
          </span>
          <span className="text-[9px] text-[var(--text-muted)]">Filtrar</span>
        </div>

        <button
          onClick={() => setFiltroSla('todos')}
          className={`flex justify-between items-center text-xs font-semibold px-2 py-1 rounded transition-all cursor-pointer text-left ${
            filtroSla === 'todos'
              ? 'bg-emerald-500/20 border border-[var(--brand-accent)]'
              : 'hover:bg-emerald-500/10'
          }`}
        >
          <span className="text-emerald-500 font-bold">Total Mapeados</span>
          <span className="font-bold text-sm text-emerald-500">{contadoresSla.total}</span>
        </button>

        <button
          onClick={() => setFiltroSla('violada')}
          className={`flex justify-between items-center text-xs font-semibold px-2 py-1 rounded transition-all cursor-pointer text-left ${
            filtroSla === 'violada'
              ? 'bg-rose-500/20 border border-rose-500'
              : 'hover:bg-rose-500/10'
          }`}
        >
          <span className="text-rose-500 font-bold">Violadas (≤ 0d)</span>
          <span className="font-bold text-sm text-rose-500">{contadoresSla.violada}</span>
        </button>

        <button
          onClick={() => setFiltroSla('12dias')}
          className={`flex justify-between items-center text-xs font-semibold px-2 py-1 rounded transition-all cursor-pointer text-left ${
            filtroSla === '12dias'
              ? 'bg-orange-500/20 border border-orange-500'
              : 'hover:bg-orange-500/10'
          }`}
        >
          <span className="text-orange-500 font-bold">Até 12 Dias</span>
          <span className="font-bold text-sm text-orange-500">{contadoresSla.ate12}</span>
        </button>

        <button
          onClick={() => setFiltroSla('20dias')}
          className={`flex justify-between items-center text-xs font-semibold px-2 py-1 rounded transition-all cursor-pointer text-left ${
            filtroSla === '20dias'
              ? 'bg-amber-400/20 border border-amber-400'
              : 'hover:bg-amber-400/10'
          }`}
        >
          <span className="text-amber-500 font-bold">Até 20 Dias</span>
          <span className="font-bold text-sm text-amber-500">{contadoresSla.ate20}</span>
        </button>

        <button
          onClick={() => setFiltroSla('30dias')}
          className={`flex justify-between items-center text-xs font-semibold px-2 py-1 rounded transition-all cursor-pointer text-left ${
            filtroSla === '30dias'
              ? 'bg-sky-500/20 border border-sky-500'
              : 'hover:bg-sky-500/10'
          }`}
        >
          <span className="text-sky-500 font-bold">Até 30 Dias</span>
          <span className="font-bold text-sm text-sky-500">{contadoresSla.ate30}</span>
        </button>
      </div>

      {/* Floating Legend Panel */}
      <div className="absolute bottom-5 left-3 w-[200px] max-h-[250px] overflow-y-auto bg-[var(--bg-glass)] backdrop-blur-md border border-[var(--border-light)] rounded-lg p-2.5 z-[1000] shadow-md">
        <div className="text-[11px] font-bold text-[var(--brand-dark)] border-b border-[var(--border-light)] pb-1 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
          <i className="fa-solid fa-palette text-[var(--brand-accent)]"></i> Cores por Etapa
        </div>
        <div className="flex flex-col gap-1">
          {Object.keys(mapaCoresEtapas).length === 0 ? (
            <div className="text-[11px] text-[var(--text-muted)]">Sem etapas no contrato...</div>
          ) : (
            Object.entries(mapaCoresEtapas).map(([etapa, cor]) => (
              <div key={etapa} className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main)]">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white shrink-0 shadow-xs"
                  style={{ backgroundColor: cor }}
                ></span>
                <span className="truncate" title={etapa}>
                  {etapa}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Leaflet map DOM node */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[480px]" />
    </div>
  );
};
