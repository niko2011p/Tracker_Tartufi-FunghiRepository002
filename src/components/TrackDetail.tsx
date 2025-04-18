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
                      width: 32px;
                      height: 32px;
                      position: relative;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                    ">
                      <div style="
                        width: 14px;
                        height: 20px;
                        background-color: ${track.startMarker.color};
                        clip-path: polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                      "></div>
                      <div style="
                        width: 3px;
                        height: 24px;
                        background-color: #555;
                        margin-top: -4px;
                      "></div>
                    </div>
                  `,
                  className: 'start-flag-icon',
                  iconSize: [32, 44],
                  iconAnchor: [7, 44],
                  popupAnchor: [0, -44]
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
                      width: 32px;
                      height: 32px;
                      position: relative;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                    ">
                      <div style="
                        width: 14px;
                        height: 20px;
                        background-color: ${track.endMarker.color};
                        clip-path: polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                      "></div>
                      <div style="
                        width: 3px;
                        height: 24px;
                        background-color: #555;
                        margin-top: -4px;
                      "></div>
                    </div>
                  `,
                  className: 'end-flag-icon',
                  iconSize: [32, 44],
                  iconAnchor: [7, 44], 
                  popupAnchor: [0, -44]
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