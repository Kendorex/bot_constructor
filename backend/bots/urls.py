from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *


router = DefaultRouter()
router.register(r'bots', TelegramBotViewSet, basename='bot')

urlpatterns = [
    path('', include(router.urls)),
    path('bots/<int:pk>/tables/', TelegramBotViewSet.as_view({'get': 'get_bot_tables'}), name='bot-tables'),
    path('bots/<int:pk>/tables/<str:table_name>/', TelegramBotViewSet.as_view({'get': 'get_table_data'}), name='bot-table-data'),
    path('bots/<int:pk>/users/', TelegramBotViewSet.as_view({'get': 'get_bot_users'}), name='bot-users'),
    path('bots/<int:pk>/import-database/', TelegramBotViewSet.as_view({'post': 'import_database'}), name='import-database'),
]