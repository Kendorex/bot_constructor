from django.db import models
import json
from django.utils import timezone
import requests


# models.py
class TelegramBot(models.Model):
    SCHEMA_CHOICES = [
        ('support', 'Support Bot (поддержка)'),
        ('survey', 'Survey Bot (опросник)'),
        ('ecommerce', 'E-commerce Bot (магазин)'),
        ('custom', 'Custom (своя схема)'),
    ]
    
    token = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=False)
    config = models.JSONField(default=dict, blank=True)
    selected_schema = models.CharField(
        max_length=20, 
        choices=SCHEMA_CHOICES, 
        null=True, 
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    @classmethod
    def create_bot(cls, token):
        # Пробуем получить информацию о боте из Telegram API
        bot_data = None
        try:
            response = requests.get(
                f'https://api.telegram.org/bot{token}/getMe',
                timeout=5
            )
            data = response.json()
            if data.get('ok') and data.get('result'):
                bot_data = data['result']
        except Exception as e:
            print(f"Error fetching bot info: {e}")
        
        # Формируем имя бота
        name = None
        if bot_data:
            # Пробуем получить username или first_name из ответа Telegram
            name = bot_data.get('username') or bot_data.get('first_name')
        
        # Если не получили имя из API или запрос не удался
        if not name:
            # Используем первую часть токена как fallback
            name = f"Bot_{token.split(':')[0]}"
        
        # Создаем и сохраняем бота
        bot = cls(
            token=token,
            name=name,
            config={},
            is_active=False
        )
        bot.save()

    
    def get_config(self):
        return self.config or {
            'commands': ['/start'],
            'nodes': [],
            'edges': [],
            'viewport': {'x': 0, 'y': 0, 'zoom': 1},
            'activeCommand': '/start'
        }
    

    def update_config(self, new_config):
        """Обновляет конфигурацию бота"""
        self.config = new_config
        self.save()

class UserInteraction(models.Model):
    bot = models.ForeignKey(TelegramBot, on_delete=models.CASCADE)
    user_id = models.BigIntegerField()
    username = models.CharField(max_length=100, null=True, blank=True)
    first_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100, null=True, blank=True)
    interaction_count = models.IntegerField(default=0)
    last_interaction = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('bot', 'user_id')

    def __str__(self):
        return f"User {self.user_id} ({self.username})"

class Broadcast(models.Model):
    bot = models.ForeignKey(TelegramBot, on_delete=models.CASCADE)
    message = models.TextField()
    scheduled_time = models.DateTimeField()
    is_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Broadcast #{self.id}"
    

class UserBotState(models.Model):
    user = models.OneToOneField(
        UserInteraction, 
        on_delete=models.CASCADE,
        related_name='bot_state',
        primary_key=True
    )
    current_node = models.CharField(max_length=100, blank=True, null=True)
    data = models.JSONField(default=dict, blank=True)  # Для хранения дополнительных данных
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(blank=True, null=True)  # Для автоматического очищения старых состояний

    class Meta:
        verbose_name = "Состояние пользователя"
        verbose_name_plural = "Состояния пользователей"
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"Состояние пользователя {self.user.user_id} (Бот: {self.user.bot.name})"

    def save(self, *args, **kwargs):
        # Автоматически устанавливаем срок истечения через 24 часа
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(hours=24)
        super().save(*args, **kwargs)