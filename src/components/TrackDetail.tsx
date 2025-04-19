            {/* Traccia con stile tratteggiato */}
            {track.coordinates && track.coordinates.length > 1 && (
              <Polyline 
                positions={track.coordinates} 
                color="#f5a149"
                weight={4}
                opacity={0.8}
                dashArray="10, 10"  /* Questo rende la linea tratteggiata */
              />
            )}
            
            {/* Marcador de inicio (bandera verde) */}
            {track.startMarker && (
              <Marker
                position={track.startMarker.coordinates}
                icon={L.divIcon({
                  html: `
                    <div class="marker-flag" style="
                      width: 40px;
                      height: 40px;
                      position: relative;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      z-index: 1000;
                    ">
                      <div style="
                        width: 40px;
                        height: 40px;
                        background-image: url('/assets/icons/Start_Track_icon.svg');
                        background-size: contain;
                        background-position: center;
                        background-repeat: no-repeat;
                        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
                      "></div>
                    </div>
                  `,
                  className: 'start-flag-icon',
                  iconSize: [40, 40],
                  iconAnchor: [20, 40],
                  popupAnchor: [0, -40]
                })}
              >
                <Popup>
                  <div>
                    <strong>Punto de inicio</strong>
                    <p>Hora: {new Date(track.actualStartTime || track.startTime).toLocaleTimeString()}</p>
                    <p>Precisión: {track.startMarker.accuracy.toFixed(1)}m</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Marcador de fin (bandera naranja) */}
            {track.endMarker && (
              <Marker
                position={track.endMarker.coordinates}
                icon={L.divIcon({
                  html: `
                    <div class="marker-flag" style="
                      width: 40px;
                      height: 40px;
                      position: relative;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      z-index: 1000;
                    ">
                      <div style="
                        width: 40px;
                        height: 40px;
                        background-image: url('/assets/icons/End_Track_icon.svg');
                        background-size: contain;
                        background-position: center;
                        background-repeat: no-repeat;
                        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
                      "></div>
                    </div>
                  `,
                  className: 'end-flag-icon',
                  iconSize: [40, 40],
                  iconAnchor: [20, 40], 
                  popupAnchor: [0, -40]
                })}
              >
                <Popup>
                  <div>
                    <strong>Punto final</strong>
                    <p>Hora: {new Date(track.actualEndTime || track.endTime).toLocaleTimeString()}</p>
                    <p>Precisión: {track.endMarker.accuracy.toFixed(1)}m</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Fallback: Si no hay coordenadas múltiples pero hay una location, muestra un círculo */} 