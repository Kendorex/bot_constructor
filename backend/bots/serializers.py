from rest_framework import serializers
from .models import TelegramBot, Broadcast, UserInteraction
from django.utils import timezone

# serializers.py
class TelegramBotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelegramBot
        fields = ['id', 'token', 'name', 'is_active', 'config', 'selected_schema']
        extra_kwargs = {
            'token': {'write_only': True},
            'name': {'required': False},
            'selected_schema': {'required': False},
        }
    
    def validate_token(self, value):
        value = value.strip()
        if ':' not in value:
            raise serializers.ValidationError("Invalid token format")
        return value

class BroadcastSerializer(serializers.ModelSerializer):
    bot_name = serializers.CharField(source='bot.name', read_only=True)
    bot_id = serializers.PrimaryKeyRelatedField(queryset=TelegramBot.objects.all(), source='bot')
    scheduled_time = serializers.DateTimeField(format="%Y-%m-%d %H:%M")
    
    class Meta:
        model = Broadcast
        fields = ['id', 'bot_id', 'bot_name', 'message', 'scheduled_time', 'is_sent', 'created_at']
        extra_kwargs = {
            'is_sent': {'read_only': True},
            'created_at': {'read_only': True},
        }
    
    def validate_scheduled_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Время рассылки не может быть в прошлом")
        return value
    
    def validate(self, data):
        if not data['bot'].is_active:
            raise serializers.ValidationError("Нельзя создать рассылку для неактивного бота")
        return data

class UserInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserInteraction
        fields = ['user_id', 'username', 'first_name', 'last_name', 
                 'interaction_count', 'last_interaction', 'created_at']

class BotOperationSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['start', 'stop'])
    
    def validate(self, data):
        bot = self.context['bot']
        if data['action'] == 'start' and bot.is_active:
            raise serializers.ValidationError("Бот уже запущен")
        if data['action'] == 'stop' and not bot.is_active:
            raise serializers.ValidationError("Бот не запущен")
        return data
    
