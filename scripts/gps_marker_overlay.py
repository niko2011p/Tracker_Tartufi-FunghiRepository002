from PIL import Image, ImageDraw, ImageFont, ExifTags
import piexif
from fractions import Fraction
import math
import os
import sys
from typing import Tuple, Optional, List

class GPSMarkerOverlay:
    def __init__(self, image_path: str):
        self.image_path = image_path
        self.image = Image.open(image_path)
        self.draw = ImageDraw.Draw(self.image)
        self.markers: List[Tuple[float, float]] = []
        
    def _convert_to_degrees(self, value: tuple) -> float:
        """Convert GPS coordinates from EXIF format to decimal degrees."""
        d = float(value[0].numerator) / float(value[0].denominator)
        m = float(value[1].numerator) / float(value[1].denominator)
        s = float(value[2].numerator) / float(value[2].denominator)
        return d + (m / 60.0) + (s / 3600.0)

    def _get_gps_data(self) -> Optional[Tuple[float, float]]:
        """Extract GPS coordinates from image EXIF data."""
        try:
            exif = piexif.load(self.image.info['exif'])
            gps_info = exif['GPS']

            if not gps_info:
                return None

            lat = self._convert_to_degrees(gps_info[piexif.GPSIFD.GPSLatitude])
            lon = self._convert_to_degrees(gps_info[piexif.GPSIFD.GPSLongitude])
            
            # Apply N/S and E/W reference
            if gps_info[piexif.GPSIFD.GPSLatitudeRef] == b'S':
                lat = -lat
            if gps_info[piexif.GPSIFD.GPSLongitudeRef] == b'W':
                lon = -lon
                
            return (lat, lon)
        except (KeyError, AttributeError, TypeError):
            return None

    def _gps_to_pixel(self, lat: float, lon: float, 
                     ref_lat: float, ref_lon: float) -> Tuple[int, int]:
        """Convert GPS coordinates to pixel coordinates using simple projection."""
        img_width, img_height = self.image.size
        
        # Calculate pixel position using Mercator-like projection
        x = int((lon - ref_lon) * (img_width / 360) + img_width / 2)
        y = int((ref_lat - lat) * (img_height / 180) + img_height / 2)
        
        return (x, y)

    def add_marker(self, lat: float, lon: float):
        """Add a GPS marker to be drawn."""
        self.markers.append((lat, lon))

    def draw_marker(self, x: int, y: int, color: str = '#FF0000', size: int = 20):
        """Draw a marker at the specified pixel coordinates."""
        # Draw outer circle
        self.draw.ellipse(
            [(x - size, y - size), (x + size, y + size)],
            outline=color,
            width=3
        )
        
        # Draw inner circle
        inner_size = size // 2
        self.draw.ellipse(
            [(x - inner_size, y - inner_size), (x + inner_size, y + inner_size)],
            fill=color
        )
        
        # Draw crosshair lines
        line_length = size * 1.5
        self.draw.line([(x, y - line_length), (x, y + line_length)], fill=color, width=2)
        self.draw.line([(x - line_length, y), (x + line_length, y)], fill=color, width=2)

    def add_legend(self):
        """Add a legend to the image."""
        legend_text = "GPS Markers"
        font_size = 24
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except OSError:
            font = ImageFont.load_default()

        # Draw legend background
        padding = 10
        text_bbox = self.draw.textbbox((0, 0), legend_text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        legend_width = text_width + padding * 4 + 30  # Extra space for marker sample
        legend_height = text_height + padding * 2
        
        # Position legend in top-right corner
        legend_x = self.image.width - legend_width - 20
        legend_y = 20
        
        # Draw legend box
        self.draw.rectangle(
            [(legend_x, legend_y), 
             (legend_x + legend_width, legend_y + legend_height)],
            fill='white',
            outline='black'
        )
        
        # Draw sample marker
        marker_x = legend_x + padding + 15
        marker_y = legend_y + legend_height // 2
        self.draw_marker(marker_x, marker_y, size=10)
        
        # Draw legend text
        text_x = marker_x + 30
        text_y = legend_y + padding
        self.draw.text((text_x, text_y), legend_text, fill='black', font=font)

    def process_image(self, output_path: str):
        """Process the image and draw all markers."""
        ref_coords = self._get_gps_data()
        if not ref_coords:
            raise ValueError("No GPS data found in reference image")

        ref_lat, ref_lon = ref_coords
        
        # Draw markers
        for lat, lon in self.markers:
            x, y = self._gps_to_pixel(lat, lon, ref_lat, ref_lon)
            self.draw_marker(x, y)
        
        # Add legend
        self.add_legend()
        
        # Save the result
        self.image.save(output_path, quality=95, exif=self.image.info.get('exif'))
        print(f"Processed image saved to: {output_path}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python gps_marker_overlay.py <image_path> [output_path]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'output.jpg'

    try:
        overlay = GPSMarkerOverlay(input_path)
        
        # Example: Add some test markers near the image's GPS location
        ref_coords = overlay._get_gps_data()
        if ref_coords:
            lat, lon = ref_coords
            # Add markers with small offsets for testing
            overlay.add_marker(lat + 0.001, lon + 0.001)
            overlay.add_marker(lat - 0.001, lon - 0.001)
        
        overlay.process_image(output_path)
        
    except Exception as e:
        print(f"Error processing image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()