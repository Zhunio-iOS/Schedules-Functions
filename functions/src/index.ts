import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';
import DataSnapshot = admin.database.DataSnapshot;

admin.initializeApp();

/** Sends a notification when a new date is added to a squadron. */
exports.newScheduleNotification = functions.database.ref("/squadrons/{squadron}/{date}")
	.onCreate((snapshot, context) => {

		const date = sanitizeDate(context.params.date);
		const squadron	= sanitizeSquadron(context.params.squadron);

		console.log("topic: " + squadron);

		const message = {
			notification: {
				body: 'Schedule for ' + date
			},
			topic: squadron
		};

		return admin.messaging().send(message)
			.then(res => console.log('Successfully sent message:', res))
			.catch(error => console.log('Error sending message:', error));
	});

/** Downloads the chart data. */
exports.downloadChartData = functions.https
	.onCall( (data, context) => {

		const { squadron, days, name } = data;

		return admin.database()
			.ref('squadrons')
			.child(squadron)
			.limitToLast(days)
			.once('value')
			.then(dates => {

				const response: { [key: string]: number } = {};

				dates.forEach( date => {
					const day = date.key as string;
					response[day] = hoursPerDay(name, date);
				});

				return response

			});
	});


/** Calculates the hours per day for the given date snapshot. */
function hoursPerDay(name: string, dateSnapshot: DataSnapshot): number {

	let hours = 0;

	dateSnapshot.child('events').forEach( eventSnapshot => {

		const student = eventSnapshot.child('student').val() as string;
		const instructor = eventSnapshot.child('instructor').val() as string;
		const hrs = (eventSnapshot.child('hrs').val() as string).trim();

		if ( containsCaseInsensitive(student, name) ||
			containsCaseInsensitive(instructor, name) ) {

			hours += parseFloat(hrs) || 0;
		}
	});

	return hours
}

function containsCaseInsensitive(nameOne: string, nameTwo: string): boolean {
	// tslint:disable-next-line:no-invalid-this
	return nameOne.toLowerCase().indexOf(nameTwo.toLowerCase()) !== -1;
}

function sanitizeDate(date: string): string {
	const newMoment = moment(date, 'YYYY-MM-DD');
	return newMoment.format('dddd[,] MMM Do YYYY');
}

function sanitizeSquadron(squadron: string): string {
	return squadron.replace("+", "-")
}