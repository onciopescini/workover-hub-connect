
import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, MapPin } from "lucide-react";

const HostCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Placeholder booking data
  const bookings = [
    {
      id: 1,
      title: "Riunione Team Marketing",
      customer: "Marco Rossi",
      space: "Sala Riunioni A",
      startTime: "09:00",
      endTime: "11:00",
      date: "2024-01-15",
      status: "confirmed",
      attendees: 6,
      price: 120
    },
    {
      id: 2,
      title: "Workshop Design",
      customer: "Sara Bianchi",
      space: "Spazio Creativo",
      startTime: "14:00",
      endTime: "17:00",
      date: "2024-01-15",
      status: "pending",
      attendees: 12,
      price: 180
    },
    {
      id: 3,
      title: "Sessione di Brainstorming",
      customer: "Luca Verde",
      space: "Sala Conferenze",
      startTime: "10:00",
      endTime: "12:00",
      date: "2024-01-16",
      status: "confirmed",
      attendees: 8,
      price: 150
    }
  ];

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getBookingsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return bookings.filter(booking => booking.date === dateString);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confermata</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">In attesa</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Annullata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const days = generateCalendarDays();
  const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  const selectedDateBookings = getBookingsForDate(selectedDate);

  return (
    <AppLayout
      title="Calendario Prenotazioni"
      subtitle="Visualizza e gestisci le prenotazioni dei tuoi spazi"
    >
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth(-1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth(1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, index) => {
                    const dayBookings = getBookingsForDate(day);
                    const isSelected = day.toDateString() === selectedDate.toDateString();
                    
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          relative p-2 text-sm border rounded-lg transition-colors
                          ${!isSameMonth(day) ? "text-gray-300 bg-gray-50" : ""}
                          ${isToday(day) ? "bg-blue-100 border-blue-300" : ""}
                          ${isSelected ? "bg-blue-500 text-white" : "hover:bg-gray-100"}
                          ${dayBookings.length > 0 ? "border-green-300" : ""}
                        `}
                      >
                        <span className="block">{day.getDate()}</span>
                        {dayBookings.length > 0 && (
                          <div className="flex justify-center mt-1">
                            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Date Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate.toLocaleDateString('it-IT', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </CardTitle>
                <CardDescription>
                  {selectedDateBookings.length} prenotazione/i
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDateBookings.length > 0 ? (
                  <div className="space-y-4">
                    {selectedDateBookings.map((booking) => (
                      <div key={booking.id} className="p-3 border rounded-lg">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-sm">{booking.title}</h4>
                            {getStatusBadge(booking.status)}
                          </div>
                          
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {booking.startTime} - {booking.endTime}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {booking.space}
                            </div>
                            <div className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {booking.attendees} partecipanti
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-xs text-gray-500">{booking.customer}</span>
                            <span className="text-sm font-semibold text-green-600">
                              €{booking.price}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nessuna prenotazione</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Statistiche Rapide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Prenotazioni Oggi</span>
                  <span className="font-semibold">
                    {getBookingsForDate(new Date()).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Prenotazioni Settimana</span>
                  <span className="font-semibold">8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tasso Occupazione</span>
                  <span className="font-semibold">72%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Prossime Prenotazioni</CardTitle>
            <CardDescription>Le prenotazioni dei prossimi giorni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings.slice(0, 3).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{booking.title}</p>
                      <p className="text-sm text-gray-600">
                        {booking.space} • {booking.startTime}-{booking.endTime}
                      </p>
                      <p className="text-xs text-gray-500">{booking.customer}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">€{booking.price}</p>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default HostCalendar;
