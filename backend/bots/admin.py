from datetime import timezone
import json
from django.contrib import admin
from django.http import HttpResponseRedirect
from .models import TelegramBot, Broadcast, UserBotState, UserInteraction
from django.utils.html import format_html
from aiogram.utils.token import TokenValidationError, validate_token
from django.core.exceptions import ValidationError

@admin.register(TelegramBot)
class TelegramBotAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'config_preview', 'created_at', 'updated_at', 'actions_column')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'token')
    readonly_fields = ('created_at', 'updated_at', 'config_display')
    list_per_page = 20
    actions = ['activate_bots', 'deactivate_bots', 'start_bots', 'stop_bots']
    list_editable = ('is_active',)

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'token', 'is_active')
        }),
        ('Bot Configuration', {
            'fields': ('config_display',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def config_preview(self, obj):
        if not obj.config:
            return "-"
        commands = obj.config.get('commands', [])
        nodes = len(obj.config.get('nodes', []))
        return f"{len(commands)} commands, {nodes} nodes"
    config_preview.short_description = 'Flow Config'


    def config_display(self, obj):
        if not obj.config:
            return "-"
        return format_html("<pre>{}</pre>", json.dumps(obj.config, indent=2, ensure_ascii=False))
    config_display.short_description = 'Flow Config JSON'


    def actions_column(self, obj):
        return format_html(
            '<div class="admin-actions">'
            '<a class="button start-link" href="start/{}/">Start</a>'
            '<a class="button stop-link" href="stop/{}/">Stop</a>'
            '</div>',
            obj.id, obj.id
        )
    actions_column.short_description = 'Actions'
    actions_column.allow_tags = True

    def activate_bots(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} bots activated')
    activate_bots.short_description = "Activate selected bots"

    def deactivate_bots(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} bots deactivated')
    deactivate_bots.short_description = "Deactivate selected bots"

    def start_bots(self, request, queryset):
        from .views import TelegramBotViewSet
        viewset = TelegramBotViewSet()
        viewset.request = request
        
        success = 0
        errors = []
        
        for bot in queryset:
            try:
                response = viewset.start(request, pk=bot.id)
                if response.status_code == 200:
                    success += 1
                else:
                    errors.append(f"{bot.name}: {response.data.get('error', 'Unknown error')}")
            except Exception as e:
                errors.append(f"{bot.name}: {str(e)}")
        
        if success:
            self.message_user(request, f'{success} bots started successfully')
        if errors:
            self.message_user(request, f'Errors: {", ".join(errors)}', level='error')
    start_bots.short_description = "Start selected bots"

    def stop_bots(self, request, queryset):
        from .views import TelegramBotViewSet
        viewset = TelegramBotViewSet()
        viewset.request = request
        
        success = 0
        errors = []
        
        for bot in queryset:
            try:
                response = viewset.stop(request, pk=bot.id)
                if response.status_code == 200:
                    success += 1
                else:
                    errors.append(f"{bot.name}: {response.data.get('error', 'Unknown error')}")
            except Exception as e:
                errors.append(f"{bot.name}: {str(e)}")
        
        if success:
            self.message_user(request, f'{success} bots stopped successfully')
        if errors:
            self.message_user(request, f'Errors: {", ".join(errors)}', level='error')
    stop_bots.short_description = "Stop selected bots"

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('start/<int:pk>/', self.admin_site.admin_view(self.start_bot), name='start_bot'),
            path('stop/<int:pk>/', self.admin_site.admin_view(self.stop_bot), name='stop_bot'),
        ]
        return custom_urls + urls

    def start_bot(self, request, pk):
        from .views import TelegramBotViewSet
        viewset = TelegramBotViewSet()
        viewset.request = request
        response = viewset.start(request, pk=pk)
        
        if response.status_code == 200:
            self.message_user(request, 'Bot started successfully')
        else:
            self.message_user(request, f'Error: {response.data.get("error", "Unknown error")}', level='error')
        
        return HttpResponseRedirect(request.META.get('HTTP_REFERER', '/'))

    def stop_bot(self, request, pk):
        from .views import TelegramBotViewSet
        viewset = TelegramBotViewSet()
        viewset.request = request
        response = viewset.stop(request, pk=pk)
        
        if response.status_code == 200:
            self.message_user(request, 'Bot stopped successfully')
        else:
            self.message_user(request, f'Error: {response.data.get("error", "Unknown error")}', level='error')
        
        return HttpResponseRedirect(request.META.get('HTTP_REFERER', '/'))

    class Media:
        css = {
            'all': ['admin/css/bot_admin.css']
        }

@admin.register(Broadcast)
class BroadcastAdmin(admin.ModelAdmin):
    list_display = ('bot', 'message_preview', 'scheduled_time', 'is_sent', 'recipients_count', 'created_at')
    list_filter = ('is_sent', 'bot', 'scheduled_time')
    search_fields = ('message', 'bot__name')
    readonly_fields = ('created_at', 'is_sent', 'recipients_info')
    date_hierarchy = 'scheduled_time'
    list_per_page = 20
    actions = ['send_broadcasts_now']

    fieldsets = (
        (None, {
            'fields': ('bot', 'message', 'scheduled_time', 'is_sent')
        }),
        ('Recipients', {
            'fields': ('recipients_info',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def message_preview(self, obj):
        return f"{obj.message[:50]}..." if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Message'

    def recipients_count(self, obj):
        return UserInteraction.objects.filter(bot=obj.bot).count()
    recipients_count.short_description = 'Recipients'

    def recipients_info(self, obj):
        users = UserInteraction.objects.filter(bot=obj.bot).order_by('-last_interaction')[:10]
        user_list = "\n".join([
            f"{user.first_name} {user.last_name} (@{user.username})" 
            for user in users
        ])
        return format_html("<pre>{}</pre>", user_list or "No users yet")
    recipients_info.short_description = 'Recent Users'

    def send_broadcasts_now(self, request, queryset):
        from .tasks import send_broadcast_task
        sent = 0
        
        for broadcast in queryset:
            if not broadcast.is_sent:
                send_broadcast_task.delay(broadcast.id)
                sent += 1
        
        self.message_user(request, f'{sent} broadcasts queued for sending')
    send_broadcasts_now.short_description = "Send selected broadcasts now"

@admin.register(UserInteraction)
class UserInteractionAdmin(admin.ModelAdmin):
    list_display = ('bot', 'user_info', 'interaction_count', 'last_interaction', 'created_at')
    list_filter = ('bot', 'last_interaction')
    search_fields = ('username', 'first_name', 'last_name', 'user_id')
    readonly_fields = ('created_at', 'last_interaction')
    list_per_page = 50
    date_hierarchy = 'last_interaction'

    fieldsets = (
        ('User Information', {
            'fields': ('bot', 'user_id', 'username', 'first_name', 'last_name')
        }),
        ('Interaction Stats', {
            'fields': ('interaction_count', 'last_interaction')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def user_info(self, obj):
        name = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        if obj.username:
            return f"{name} (@{obj.username})" if name else f"@{obj.username}"
        return name or str(obj.user_id)
    user_info.short_description = 'User'
    user_info.admin_order_field = 'username'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('bot')
    
    @admin.register(UserBotState)
    class UserBotStateAdmin(admin.ModelAdmin):
        list_display = ('user', 'bot', 'current_node', 'last_interaction', 'expires_soon')
        list_filter = ('user__bot', 'expires_at')
        search_fields = ('user__username', 'user__first_name', 'current_node')
        readonly_fields = ('created_at', 'updated_at', 'expires_at_display')
        list_select_related = ('user', 'user__bot')
        date_hierarchy = 'expires_at'

        fieldsets = (
            ('User Information', {
                'fields': ('user',)
            }),
            ('State Information', {
                'fields': ('current_node', 'data_display')
            }),
            ('Timestamps', {
                'fields': ('created_at', 'updated_at', 'expires_at_display'),
                'classes': ('collapse',)
            }),
        )

        def bot(self, obj):
            return obj.user.bot
        bot.admin_order_field = 'user__bot'

        def last_interaction(self, obj):
            return obj.user.last_interaction
        last_interaction.admin_order_field = 'user__last_interaction'

        def expires_soon(self, obj):
            if not obj.expires_at:
                return "Never"
            delta = obj.expires_at - timezone.now()
            if delta.days > 1:
                return f"In {delta.days} days"
            hours = delta.seconds // 3600
            if hours > 1:
                return f"In {hours} hours"
            return "Soon"
        expires_soon.short_description = 'Expires'

        def expires_at_display(self, obj):
            if not obj.expires_at:
                return "Never"
            return obj.expires_at.strftime("%Y-%m-%d %H:%M:%S")
        expires_at_display.short_description = 'Expires At'

        def data_display(self, obj):
            if not obj.data:
                return "-"
            return format_html("<pre>{}</pre>", json.dumps(obj.data, indent=2, ensure_ascii=False))
        data_display.short_description = 'State Data'

        def get_queryset(self, request):
            return super().get_queryset(request).select_related('user', 'user__bot')