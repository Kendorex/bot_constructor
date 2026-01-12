# import asyncio
# from aiogram import Bot, Dispatcher, types
# from aiogram.filters import Command
# from asgiref.sync import sync_to_async
# from celery import shared_task
# from .models import TelegramBot, UserInteraction

# # Словарь для хранения активных ботов (лучше использовать Redis в production)
# bot_instances = {}

# @shared_task
# def start_single_bot(token, bot_id):
#     """Задача для запуска бота"""
#     try:
#         print(f"Попытка запуска бота с токеном: {token[:5]}...")
        
#         # Создаём новый event loop для этого потока
#         loop = asyncio.new_event_loop()
#         asyncio.set_event_loop(loop)
        
#         async def main():
#             # Получаем данные бота из БД
#             bot_instance = await sync_to_async(TelegramBot.objects.get)(id=bot_id)
#             bot = Bot(token=token)
#             dp = Dispatcher()
            
#             # Регистрируем обработчики
#             @dp.message(Command("start"))
#             async def start_cmd(message: types.Message):
#                 await message.answer(f"Бот работает! Ваш ID: {message.from_user.id}")
                
#             @dp.message()
#             async def echo(message: types.Message):
#                 await message.answer(f"Вы написали: {message.text}")
            
#             # Сохраняем экземпляр бота
#             bot_instances[token] = {
#                 'bot': bot,
#                 'dispatcher': dp,
#                 'loop': loop
#             }
            
#             try:
#                 print(f"Бот {token[:5]}... начал работу")
#                 await dp.start_polling(bot)
#             except Exception as e:
#                 print(f"Ошибка в боте {token[:5]}...: {e}")
#             finally:
#                 if token in bot_instances:
#                     del bot_instances[token]
#                 await bot.session.close()
        
#         # Запускаем бота в event loop
#         loop.run_until_complete(main())
        
#     except Exception as e:
#         print(f"Ошибка при запуске бота: {e}")
#         # Можно добавить повторную попытку через некоторое время
#         start_single_bot.retry(args=[token, bot_id], countdown=60)

# @shared_task
# def stop_single_bot(token):
#     """Задача для остановки бота"""
#     print(f"Попытка остановки бота {token[:5]}...")
    
#     if token not in bot_instances:
#         print(f"Бот {token[:5]}... не найден среди активных")
#         return
    
#     bot_data = bot_instances[token]
#     loop = bot_data['loop']
#     dp = bot_data['dispatcher']
    
#     async def stop_polling():
#         await dp.stop_polling()
#         print(f"Бот {token[:5]}... успешно остановлен")
    
#     # Останавливаем бота в его event loop
#     loop.call_soon_threadsafe(lambda: loop.create_task(stop_polling()))