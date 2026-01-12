import asyncio
import threading
import importlib.util
import logging
from pathlib import Path
from typing import Dict
from django.conf import settings
from ..models import TelegramBot

logger = logging.getLogger(__name__)

# Глобальное хранилище для запущенных ботов
running_bots: Dict[str, Dict] = {}

class BotRunner:
    def __init__(self, bot: TelegramBot):
        self.bot = bot
    
    def get_bot_directory(self) -> Path:
        """Get bot directory path"""
        bots_dir = Path(settings.BASE_DIR) / 'telegram_bots'
        bots_dir.mkdir(exist_ok=True)
        return bots_dir / f"bot_{self.bot.id}"
    
    def load_bot_module(self):
        """Dynamically load bot module"""
        bot_dir = self.get_bot_directory()
        
        import sys
        sys.path.insert(0, str(bot_dir.parent))
        
        try:
            # First load database module
            db_spec = importlib.util.spec_from_file_location(
                f"bot_{self.bot.id}.bot_database",
                bot_dir / 'bot_database.py'
            )
            db_module = importlib.util.module_from_spec(db_spec)
            sys.modules[f"bot_{self.bot.id}.bot_database"] = db_module
            db_spec.loader.exec_module(db_module)
            
            # Then load main bot module
            spec = importlib.util.spec_from_file_location(
                f"bot_{self.bot.id}.bot",
                bot_dir / 'bot.py'
            )
            module = importlib.util.module_from_spec(spec)
            sys.modules[f"bot_{self.bot.id}.bot"] = module
            spec.loader.exec_module(module)
            
            module.db = db_module.db
            
            return module
        finally:
            sys.path.remove(str(bot_dir.parent))
    
    async def run_bot_async(self):
        """Async bot runner"""
        try:
            bot_module = self.load_bot_module()
            await bot_module.main()
        except Exception as e:
            logger.error(f"Error in bot {self.bot.id}: {str(e)}", exc_info=True)
            if self.bot.token in running_bots:
                del running_bots[self.bot.token]
            self.bot.is_active = False
            self.bot.save()
    
    def run_bot(self):
        """Run bot in a separate thread"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            running_bots[self.bot.token] = {
                'loop': loop,
                'thread': threading.current_thread()
            }
            
            logger.info(f"Starting bot {self.bot.id}")
            loop.run_until_complete(self.run_bot_async())
        except Exception as e:
            logger.error(f"Error starting bot {self.bot.id}: {str(e)}", exc_info=True)
            if self.bot.token in running_bots:
                del running_bots[self.bot.token]
            self.bot.is_active = False
            self.bot.save()
    
    def stop_bot(self):
        """Stop running bot"""
        if self.bot.token not in running_bots:
            return False
        
        try:
            bot_info = running_bots[self.bot.token]
            loop = bot_info['loop']
            
            # Stop event loop
            loop.call_soon_threadsafe(loop.stop)
            
            del running_bots[self.bot.token]
            self.bot.is_active = False
            self.bot.save()
            
            return True
        except Exception as e:
            logger.error(f"Error stopping bot: {str(e)}", exc_info=True)
            return False