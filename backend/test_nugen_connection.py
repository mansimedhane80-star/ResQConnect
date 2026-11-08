
import asyncio

from app.nugen_service import analyze_sos, NuGenError


async def main():
    message = (
        "माझ्या घरात पाणी शिरत आहे. "
        "आम्ही तीन जण घरात अडकलो आहोत."
    )

    print("Testing actual ResQ Connect NuGen service...")

    try:
        result = await analyze_sos(message)

        print("\nSUCCESS!")
        print(result)

    except NuGenError as exc:
        print("\nNUGEN SERVICE ERROR:")
        print(type(exc).__name__)
        print(str(exc))

    except Exception as exc:
        print("\nUNEXPECTED ERROR:")
        print(type(exc).__name__)
        print(str(exc))


if __name__ == "__main__":
    asyncio.run(main())
