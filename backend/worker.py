from app.main import app, background_worker, logger


def main():
    logger.info("InvestCool data worker started")
    with app.app_context():
        background_worker()


if __name__ == "__main__":
    main()
