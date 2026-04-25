import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

class NearbyPlacesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 5000)
        place_type = request.query_params.get('type', 'hospital')

        if not lat or not lng:
            return Response(
                {'error': 'Latitude and longitude required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Map your types to Baato search query
        type_query_map = {
            'hospital': 'hospital',
            'pharmacy': 'pharmacy',
            'clinic': 'clinic',
        }
        query = type_query_map.get(place_type, place_type)

        url = 'https://api.baato.io/api/v1/search'
        params = {
            'key': settings.BAATO_API_KEY,
            'q': query,
            'lat': lat,
            'lon': lng,
            'radius': radius,
            'limit': 20,
        }

        try:
            response = requests.get(url, params=params)
            print("Baato API response:", response.status_code, response.text[:300])
            response.raise_for_status()
            data = response.json()

            # Normalize to match your frontend Place interface
            results = []
            for place in data.get('data', []):
                results.append({
                    'id': str(place.get('placeId', '')),
                    'name': place.get('name', ''),
                    'vicinity': place.get('address', ''),
                    'rating': None,
                    'user_ratings_total': None,
                    'geometry': {
                        'location': {
                            'lat': place.get('centroid', {}).get('lat', 0),
                            'lng': place.get('centroid', {}).get('lon', 0),
                        }
                    },
                    'opening_hours': None,
                })

            return Response({'results': results})

        except Exception as e:
            print("Baato error:", str(e))
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )