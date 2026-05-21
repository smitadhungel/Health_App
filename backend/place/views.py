# import requests
# from django.conf import settings
# from django.core.cache import cache

# from rest_framework.views import APIView
# from rest_framework.response import Response
# from rest_framework import status
# from rest_framework.permissions import IsAuthenticated


# class NearbyPlacesView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         try:
#             lat = request.query_params.get('lat')
#             lng = request.query_params.get('lng')
#             radius = request.query_params.get('radius', 5000)
#             place_type = request.query_params.get('type', 'hospital')

#             # Validate coordinates
#             if not lat or not lng:
#                 return Response(
#                     {'error': 'Latitude and longitude required'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             try:
#                 lat_float = float(lat)
#                 lng_float = float(lng)
#             except ValueError:
#                 return Response(
#                     {'error': 'Invalid latitude or longitude'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             # Cache key
#             cache_key = (
#                 f"nearby_"
#                 f"{round(lat_float, 3)}_"
#                 f"{round(lng_float, 3)}_"
#                 f"{radius}_"
#                 f"{place_type}"
#             )

#             # Return cached response if exists
#             cached_data = cache.get(cache_key)
#             if cached_data:
#                 return Response(cached_data)

#             # Query mapping
#             type_query_map = {
#                 'hospital': 'hospital',
#                 'pharmacy': 'pharmacy',
#                 'clinic': 'clinic',
#             }

#             query = type_query_map.get(place_type, place_type)

#             # Baato API endpoint
#             url = 'https://api.baato.io/api/v1/search'

#             params = {
#                 'key': settings.BAATO_API_KEY,
#                 'q': query,
#                 'lat': lat_float,
#                 'lon': lng_float,
#                 'radius': radius,
#                 'limit': 20,
#             }

#             print("==== BAATO REQUEST PARAMS ====")
#             print(params)

#             # API request
#             response = requests.get(
#                 url,
#                 params=params,
#                 timeout=8,
#                 headers={
#                     'User-Agent': 'Mozilla/5.0'
#                 }
#             )

#             print("==== BAATO STATUS ====")
#             print(response.status_code)

#             response.raise_for_status()

#             data = response.json()

#             print("==== BAATO RESPONSE ====")
#             print(data)

#             results = []

#             for place in data.get('data', []):

#                 # Baato centroid format:
#                 # "coordinates": [longitude, latitude]
#                 coords = (
#                     place.get('centroid', {})
#                     .get('coordinates', [0, 0])
#                 )

#                 lng_value = coords[0] if len(coords) > 0 else 0
#                 lat_value = coords[1] if len(coords) > 1 else 0

#                 results.append({
#                     'id': str(place.get('placeId', '')),

#                     'name': place.get('name', 'Unknown Place'),

#                     'vicinity': place.get('address', ''),

#                     'rating': None,

#                     'user_ratings_total': None,

#                     'geometry': {
#                         'location': {
#                             'lat': lat_value,
#                             'lng': lng_value,
#                         }
#                     },

#                     'opening_hours': None,
#                 })

#             result_data = {
#                 'results': results
#             }

#             print("==== FINAL RESULTS ====")
#             print(result_data)

#             # Cache for 10 minutes
#             cache.set(cache_key, result_data, timeout=60 * 10)

#             return Response(result_data)

#         except requests.Timeout:
#             return Response(
#                 {'error': 'Baato API request timed out'},
#                 status=status.HTTP_504_GATEWAY_TIMEOUT
#             )

#         except requests.RequestException as e:
#             print("==== REQUEST ERROR ====")
#             print(str(e))

#             return Response(
#                 {'error': f'Baato API request failed: {str(e)}'},
#                 status=status.HTTP_502_BAD_GATEWAY
#             )

#         except Exception as e:
#             print("==== INTERNAL ERROR ====")
#             print(str(e))

#             return Response(
#                 {'error': str(e)},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )


import logging
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)
BAATO_NEARBY_URL = 'https://api.baato.io/api/v1/search/nearby'


class NearbyPlacesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            lat = request.query_params.get('lat')
            lng = request.query_params.get('lng')
            radius_input = request.query_params.get('radius', 1000)
            place_type = request.query_params.get('type', 'hospital').lower()

            if not lat or not lng:
                return Response({'error': 'lat and lng required'}, status=400)

            lat_float = float(lat)
            lng_float = float(lng)
            radius_meters = float(radius_input)
            radius_km = max(0.5, round(radius_meters / 1000, 1))

            params = {
                'key': settings.BAATO_API_KEY,
                'type': place_type,
                'lat': lat_float,
                'lon': lng_float,
                'radius': int(radius_km),
                'limit': 30,
                'sortBy': True,
            }

            response = requests.get(BAATO_NEARBY_URL, params=params, timeout=8)
            response.raise_for_status()
            data = response.json()
            
            raw_places = data.get('data', [])
            print(f"\n=== Baato returned {len(raw_places)} raw places for type={place_type} ===")
            
            # Log first 5 places with their type, name, and distance
            for i, place in enumerate(raw_places[:5]):
                print(f"Place {i}: name='{place.get('name')}', type='{place.get('type')}', distance={place.get('radialDistanceInKm')}")
            
            # For now, return the raw data so frontend can see
            # We'll just map minimal fields
            results = []
            for place in raw_places:
                centroid = place.get('centroid', {})
                lat_val = centroid.get('lat')
                lon_val = centroid.get('lon')
                if not lat_val or not lon_val:
                    continue
                results.append({
                    'id': str(place.get('placeId', '')),
                    'name': place.get('name', 'Unknown'),
                    'type_raw': place.get('type', ''),   # include raw type for debugging
                    'vicinity': place.get('address', ''),
                    'geometry': {'location': {'lat': float(lat_val), 'lng': float(lon_val)}},
                    'distance_km': round(place.get('radialDistanceInKm', 0), 2),
                })
            
            print(f"Returning {len(results)} results to frontend (no filtering)\n")
            return Response({'results': results})

        except Exception as e:
            print(f"ERROR: {e}")
            logger.exception("Error in NearbyPlacesView")
            return Response({'error': str(e)}, status=500) 